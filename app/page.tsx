import { getChatGPTUser, chatGPTSignInPath } from "./chatgpt-auth";
import { Dashboard } from "./todo-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  if (user) return <Dashboard key={user.userId} displayName={user.fullName ?? user.email} signOutHref={"/signout-with-chatgpt?return_to=%2F"} />;
  return (
    <main className="login-page">
      <div className="login-card">
        <div className="brand-mark large"><span className="brand-check">✓</span></div>
        <p className="eyebrow">IL TUO SPAZIO PERSONALE</p>
        <h1>Fai spazio alle cose<br />che contano.</h1>
        <p className="login-copy">Le tue attività e le tue aree di lavoro, visibili soltanto a te. Ogni account ha il proprio spazio.</p>
        <a className="login-button" href={chatGPTSignInPath("/")} target="_top">Accedi con ChatGPT</a>
        <div className="login-lock"><span>⌑</span> Accesso privato e protetto</div>
      </div>
      <div className="login-foot">Todly <span>·</span> il tuo tempo, con più chiarezza</div>
    </main>
  );
}
