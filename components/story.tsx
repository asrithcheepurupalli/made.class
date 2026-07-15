"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { day?: string; body: React.ReactNode; time: string; upi?: string };

const SCENES: {
  time: string;
  title: React.ReactNode;
  body: React.ReactNode;
  msg?: Msg;
}[] = [
  {
    time: "7:15 am · every school, today",
    title: <>The register is paper. The dues live in a diary. The parents find out <em>at dinner</em>.</>,
    body: (
      <>
        Teachers copy the same attendance into a register, an Excel sheet, and a government
        portal. The office chases fees by phone, family by family. And the class WhatsApp group?
        Notices sink in it by 8 am. <b>Everyone works hard. Nothing connects.</b>
      </>
    ),
  },
  {
    time: "9:40 am · the register",
    title: <>Suresh sir taps <em>twice</em>. Done.</>,
    body: (
      <>
        Everyone starts present — he taps only the two exceptions, from his own phone, before the
        chai gets cold. The principal&apos;s board flips 8-B from amber to green. <b>No paper copied
        thrice. No one asking &quot;is it marked?&quot;</b>
      </>
    ),
  },
  {
    time: "9:42 am · two minutes later",
    title: <>Farhan&apos;s father knows <em>before the second-period bell</em>.</>,
    body: (
      <>
        The absence alert lands on his WhatsApp — in Hindi, because that&apos;s his language. Not a
        missed call from an unknown number. Not a note at dinner. <b>Two minutes after the register,
        every absentee&apos;s family knows.</b>
      </>
    ),
    msg: {
      day: "Tuesday",
      body: <>प्रिय अभिभावक, फ़रहान शेख आज विद्यालय में अनुपस्थित रहे। कोई त्रुटि हो तो विद्यालय से संपर्क करें। – Sunrise Public School</>,
      time: "9:42 am",
    },
  },
  {
    time: "10:30 am · the fee reminder",
    title: <>The exact balance, <em>one tap away</em>.</>,
    body: (
      <>
        No cashier queue, no &quot;I&apos;ll send it with the driver.&quot; The reminder carries a UPI
        link with the precise amount — it opens his own payment app, pointed at <b>the school&apos;s
        own account</b>. No gateway. No convenience charges. No fee-loan in disguise.
      </>
    ),
    msg: {
      body: <>&quot;Tuition Term 1&quot; — ₹5,500 for Farhan, due this Friday.</>,
      time: "10:30 am",
      upi: "Pay ₹5,500 by UPI",
    },
  },
  {
    time: "10:32 am · the receipt",
    title: <>Paid. Receipted. <em>In the same chat.</em></>,
    body: (
      <>
        Two minutes later the money is in the school&apos;s account and the receipt is in the
        family&apos;s chat — automatically. The office didn&apos;t print anything. The dues board
        just got one row shorter. <b>Multiply this by 118 overdue families.</b>
      </>
    ),
    msg: {
      body: <>Received ₹5,500 for &quot;Tuition Term 1&quot; (Farhan). Ref UPI2467812. Thank you! 🙏 – Sunrise Public School</>,
      time: "10:32 am",
    },
  },
  {
    time: "11:05 am · the notice",
    title: <>One publish. <em>412 families.</em></>,
    body: (
      <>
        PTM on Saturday — typed once by the principal, delivered to every guardian in their own
        language, with read-tracking. Not pinned in a group where 60 parents already muted it.
        <b> 98% of WhatsApp messages get read. Circulars don&apos;t.</b>
      </>
    ),
    msg: {
      body: <>PTM this Saturday, 10 am – 1 pm. Report cards will be given to parents. – Sunrise Public School</>,
      time: "11:05 am",
    },
  },
  {
    time: "11:06 am · one Tuesday morning",
    title: <>All of that. <em>Zero apps installed.</em></>,
    body: (
      <>
        The school ran a dashboard. The teacher used his own phone. The parent used WhatsApp,
        which was already there. <b>That&apos;s the whole product</b> — attendance, fees and reach,
        with nothing new for families to learn.
      </>
    ),
  },
];

export function Story() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const chatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setActive((cur) => Math.max(cur, idx));
          }
        }
      },
      { threshold: 0.5 }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    // keep the newest message visible in the sticky phone
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active]);

  const visibleMsgs = SCENES.slice(0, active + 1)
    .map((s, i) => ({ msg: s.msg, key: i }))
    .filter((x): x is { msg: Msg; key: number } => Boolean(x.msg));

  return (
    <section className="story" id="story">
      <div className="story-chapters">
        {SCENES.map((s, i) => (
          <div
            key={i}
            className="chapter"
            data-idx={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
          >
            <div className="ch-time">{s.time}</div>
            <h2 className="ch-title">{s.title}</h2>
            <p className="ch-body">{s.body}</p>
            {s.msg && (
              <div className="chapter-msg">
                <div className="bub">
                  {s.msg.body}
                  {s.msg.upi && (
                    <span className="upi">{s.msg.upi}</span>
                  )}
                  <span className="time">{s.msg.time}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="story-sticky" aria-hidden="true">
        <div className="phone">
          <div className="wa-top">
            <div className="wa-av">SP</div>
            <div>
              <div className="t">Sunrise Public School</div>
              <div className="s">official account</div>
            </div>
          </div>
          <div className="wa-chat" style={{ minHeight: 430, maxHeight: 430, overflowY: "auto" }} ref={chatRef}>
            {visibleMsgs.length === 0 ? (
              <div className="wa-empty">
                No messages from the school.
                <br />
                <b>That silence is the problem.</b>
              </div>
            ) : (
              visibleMsgs.map(({ msg, key }) => (
                <div key={key} style={{ display: "contents" }}>
                  {msg.day && <span className="wa-day">{msg.day}</span>}
                  <div className="bub seq in">
                    {msg.body}
                    {msg.upi && <span className="upi">{msg.upi}</span>}
                    <span className="time">{msg.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="phone-cap">Imran Shaikh&apos;s phone — Farhan&apos;s father. He installed nothing.</div>
      </div>
    </section>
  );
}
