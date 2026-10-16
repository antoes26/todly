#!/usr/bin/env python3
"""Generate a private D1 import from a Todly backup; never contacts production."""
import argparse
import json
import sqlite3
import uuid
from pathlib import Path


def prepare(backup, seed, source_user, target_user):
    uuid.UUID(target_user)
    pages = backup['pages']
    if not pages or pages[-1]['model_projection']['next_offset'] is not None:
        raise ValueError('Backup incompleto')
    if any(p['model_projection']['truncated'] or p['model_projection'].get('omitted_rows') or p['model_projection'].get('truncated_values') for p in pages):
        raise ValueError('Backup con dati omessi o troncati')
    source_rows = [r for p in pages for r in p['rows'] if r['user_id'] == source_user]
    records = {}
    for task in seed:
        item = dict(task)
        if not item.get('createdAt') and item.get('sourceDate'):
            item['createdAt'] = item['sourceDate'] + 'T12:00:00.000Z'
        records[f'{target_user}:{item["id"]}'] = (target_user, json.dumps(item, ensure_ascii=False), backup['exported_at'])
    for row in source_rows:
        prefix = source_user + ':'
        if not row['key'].startswith(prefix):
            raise ValueError('Associazione utente non valida')
        json.loads(row['payload'])
        key = target_user + ':' + row['key'][len(prefix):]
        records[key] = (target_user, row['payload'], row['updated_at'])
    if not source_rows:
        raise ValueError('Utente sorgente non trovato nel backup')
    db = sqlite3.connect(':memory:')
    db.execute('CREATE TABLE task_records (key TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL)')
    db.executemany('INSERT INTO task_records VALUES (?,?,?,?)', [(key, *value) for key, value in records.items()])
    db.commit()
    # D1 owns transactions. Emit insert statements, not a SQLite BEGIN/COMMIT.
    sql = '\n'.join(line for line in db.iterdump() if line.startswith('INSERT INTO ')) + '\n'
    return sql, len(records)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for field in ['backup', 'seed', 'source-user', 'target-user', 'output']:
        parser.add_argument('--' + field, required=True)
    args = parser.parse_args()
    output = Path(args.output)
    if output.exists():
        parser.error('Il file di destinazione esiste gia: usare un nuovo nome')
    sql, count = prepare(json.loads(Path(args.backup).read_text()), json.loads(Path(args.seed).read_text()), args.source_user, args.target_user)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(sql)
    output.chmod(0o600)
    print(f'Preparati {count} record per il nuovo account. Nessun dato e stato caricato online.')
