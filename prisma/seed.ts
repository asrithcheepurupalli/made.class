import { PrismaClient } from "@prisma/client";
import { ensureDemoData } from "../lib/demo-seed";

const db = new PrismaClient();

ensureDemoData(db)
  .then((seeded) => {
    if (!seeded) {
      console.log("Already seeded; skipping. (Reset the database to reseed.)");
      return;
    }
    console.log("Seeded Sunrise Public School (12 classes, ~447 students, invoices, history).");
    console.log("Logins (password demo123): principal@sunrise.school · teacher@sunrise.school · desk@sunrise.school");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
