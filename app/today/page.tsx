import Link from "next/link";
import { requireUserWithSchool } from "@/lib/auth";
import { inr } from "@/lib/format";
import { classBoard, todayStats, recentActivity, registerStreak, absentStreaks } from "@/lib/queries";
import { Shell, Avatar, Ring } from "@/components/shell";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

function lakh(n: number): string {
  return n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : inr(n);
}

export default async function TodayPage() {
  const { user, school } = await requireUserWithSchool(["principal"]);
  const [stats, board, feed, streak, absentees] = await Promise.all([
    todayStats(school.id), classBoard(school.id), recentActivity(school.id, 6), registerStreak(school.id), absentStreaks(school.id, 3),
  ]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.name.replace(/^Principal\s+/i, "");
  const pct = stats.marked ? Math.round((stats.present / stats.marked) * 100) : 0;
  const unmarked = board.filter((b) => !b.marked);
  const dateLine = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <Shell role={user.role} active="/today" userName={user.name}>
      <h1>
        {greeting}, {firstName}.<small>{dateLine} · Term 1</small>
      </h1>

      <div className="hero3">
        <div className="inst">
          <Ring pct={pct} />
          <div>
            <div className="big">
              {stats.present}
              <small>/{stats.studentCount}</small>
            </div>
            <div className="cap">
              present{unmarked.length > 0 ? ` · ${unmarked.map((u) => u.name).join(", ")} left to mark` : " · all registers in"}
            </div>
          </div>
        </div>
        <div className="inst">
          <div className="roundbadge ok">₹</div>
          <div>
            <div className="big">{inr(stats.collectedToday)}</div>
            <div className="cap">collected today{stats.collectedToday > 0 ? ` · ${stats.upiShare}% UPI` : ""}</div>
          </div>
        </div>
        <div className="inst bad">
          <div className="roundbadge">
            <span>
              {stats.over30Families}
              <br />
              <span style={{ fontSize: 9.5, fontWeight: 400 }}>families</span>
            </span>
          </div>
          <div>
            <div className="big">{lakh(stats.outstanding)}</div>
            <div className="cap">outstanding · {lakh(stats.over30)} past 30 days</div>
          </div>
        </div>
      </div>

      <div className="sect">
        <h2>
          Registers today <span className="more">tap a class to open</span>
        </h2>
        <div className="board">
          {board.length === 0 && (
            <Link href="/students" className="tile pending" style={{ gridColumn: "1 / -1" }}>
              <span className="cl">No classes yet <span className="pend">start here</span></span>
              <span className="n">Add your first class and students →</span>
            </Link>
          )}
          {board.map((c) => (
            <Link key={c.id} href={`/attendance?class=${c.id}`} className={`tile ${c.marked ? "" : "pending"}`}>
              <span className="cl">
                {c.name} {c.marked ? <span className="ok">✓</span> : <span className="pend">⏳</span>}
              </span>
              <span className="bar">
                <i style={{ width: c.marked && c.markedCount ? `${Math.round((c.present / c.markedCount) * 100)}%` : 0 }} />
              </span>
              <span className="n">{c.marked ? `${c.present}/${c.markedCount} in` : "not marked"}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="sect">
        <h2>
          <span className="pulse" aria-hidden="true"></span> Happening now
        </h2>
        <div>
          {feed.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Quiet so far — activity shows up here as it happens.</p>
          ) : (
            feed.map((f, i) => (
              <div className="li" key={i}>
                <Avatar name={f.name} />
                <span className="who">
                  <b>{f.text}</b> <span className="dim">· {f.name} · {f.dim}</span>
                </span>
                <span className={`tag ${f.tag[0]}`}>{f.tag[1]}</span>
                <span className="when">
                  {f.at.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sect">
        <h2>Needs you</h2>
        <div className="needs">
          {unmarked.length > 0 ? (
            <Link href={`/attendance?class=${unmarked[0].id}`} className="need a">
              <span className="k">Register</span>
              <span className="v">{unmarked.map((u) => u.name).join(", ")} not marked</span>
              <span className="m">the office can see it&apos;s pending</span>
            </Link>
          ) : (
            <div className="need g">
              <span className="k">Registers</span>
              <span className="v">All {board.length} classes in</span>
              <span className="m">every parent already informed</span>
            </div>
          )}
          <div className={`need ${absentees.length ? "r" : "g"}`}>
            <span className="k">Absent 3+ days</span>
            <span className="v">{absentees.length ? absentees.join(" · ") : "No one"}</span>
            <span className="m">{absentees.length ? "worth a phone call today" : "no long absences running"}</span>
          </div>
          <Link href="/fees" className="need r">
            <span className="k">{lakh(stats.over30)} · 30+ days</span>
            <span className="v">{stats.over30Families} families</span>
            <span className="m">a personal note works best now</span>
          </Link>
        </div>
      </div>

      {streak > 0 && (
        <div className="streak">
          <span>✓</span>
          <div>
            <b>{streak} school day{streak > 1 ? "s" : ""}</b> with every register complete. Keep the run going.
          </div>
        </div>
      )}
    </Shell>
  );
}
