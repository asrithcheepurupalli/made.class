import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { updateSchoolSettings } from "@/app/actions";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser(["principal"]);
  const school = await db.school.findFirst();
  if (!school) return null;

  return (
    <Shell role={user.role} active="/settings" userName={user.name}>
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
    </Shell>
  );
}
