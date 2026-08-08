import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential:
          process.env.GOOGLE_SERVICE_ACCOUNT_JSON
            ? cert(JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON))
            : applicationDefault(),
        projectId: "admisun",
      });

const adminDb = getFirestore(app);

export { adminDb };
console.log("=== FIREBASE ADMIN ===");
console.log("Project ID:", app.options.projectId);
console.log(
  "Using service account:",
  !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON
);
console.log("======================");