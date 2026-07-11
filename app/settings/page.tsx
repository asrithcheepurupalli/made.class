import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Shell, PageTitle, Card, inputCls, btnCls } from "@/components/shell";
import { updateSchoolSettings } from "@/app/actions";

export default async function SettingsPage() {
  const user = await requireUser();
  const school = await db.school.findFirst();
  if (!school) return null;

  return (
    <Shell schoolName={school.name} userName={user.name}>
      <PageTitle title="Settings" subtitle="School profile and payment details" />
      <Card className="max-w-lg">
        <form action={updateSchoolSettings} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">School name</label>
            <input name="name" defaultValue={school.name} className={inputCls} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Address</label>
            <input name="address" defaultValue={school.address ?? ""} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Phone</label>
            <input name="phone" defaultValue={school.phone ?? ""} className={inputCls} />
          </div>
          <div className="border-t border-stone-200 pt-3">
            <h2 className="mb-2 text-sm font-semibold text-stone-700">UPI collection</h2>
            <p className="mb-2 text-xs text-stone-500">
              Fee reminder links pay directly into this UPI ID — no intermediary, no convenience charges.
            </p>
            <div className="space-y-2">
              <input name="upiVpa" defaultValue={school.upiVpa ?? ""} placeholder="UPI ID (e.g. school@icici)" className={inputCls} />
              <input name="upiPayee" defaultValue={school.upiPayee ?? ""} placeholder="Payee name shown in UPI apps" className={inputCls} />
            </div>
          </div>
          <button className={btnCls}>Save settings</button>
        </form>
      </Card>
    </Shell>
  );
}
