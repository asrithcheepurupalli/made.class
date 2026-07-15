import { db } from "@/lib/db";
import { requireUserWithSchool } from "@/lib/auth";
import { Shell, Flash } from "@/components/shell";
import { updateSchoolSettings, changePassword } from "@/app/actions";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ pw?: string }>;
}) {
  const { user, school } = await requireUserWithSchool(["principal"]);
  const sp = await searchParams;

  return (
    <Shell role={user.role} active="/settings" userName={user.name}>
      {sp.pw && <Flash>Password changed</Flash>}
      <h1>Settings<small>school profile & payments</small></h1>
      <div className="sect fld" style={{ maxWidth: "52ch", marginTop: 6 }}>
        <form action={updateSchoolSettings}>
          <label htmlFor="name">School name</label>
          <input id="name" name="name" defaultValue={school.name} required />
          <label htmlFor="address">Address</label>
          <input id="address" name="address" defaultValue={school.address ?? ""} />
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" defaultValue={school.phone ?? ""} />
          <label htmlFor="upiVpa">UPI ID (fees land here directly — no gateway, no charges)</label>
          <input id="upiVpa" name="upiVpa" defaultValue={school.upiVpa ?? ""} placeholder="school@icici" />
          <label htmlFor="upiPayee">Payee name shown in UPI apps</label>
          <input id="upiPayee" name="upiPayee" defaultValue={school.upiPayee ?? ""} />
          <div style={{ marginTop: 22 }}>
            <button className="btn">Save settings</button>
          </div>
        </form>
      </div>

      <div className="sect fld" style={{ maxWidth: "52ch" }}>
        <h2>Change password</h2>
        <form action={changePassword}>
          <label htmlFor="current">Current password</label>
          <input id="current" name="current" type="password" required />
          <label htmlFor="next">New password (8+ characters)</label>
          <input id="next" name="next" type="password" minLength={8} required />
          <div style={{ marginTop: 20 }}>
            <button className="btn quiet">Change password</button>
          </div>
        </form>
      </div>
    </Shell>
  );
}
