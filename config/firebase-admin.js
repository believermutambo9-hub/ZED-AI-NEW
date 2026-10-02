import {
  cert,
  getApps,
  initializeApp
} from "firebase-admin/app";

import {
  getFirestore
} from "firebase-admin/firestore";

let firebaseAdminApp = null;

export function getFirebaseAdminApp() {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  const serviceAccountJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  const projectId =
    process.env.FIREBASE_PROJECT_ID;

  if (!serviceAccountJson) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is missing."
    );
  }

  if (!projectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID is missing."
    );
  }

  let serviceAccount;

  try {
    serviceAccount =
      JSON.parse(
        serviceAccountJson
      );
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON."
    );
  }

  firebaseAdminApp =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert({
            projectId,
            clientEmail:
              serviceAccount.client_email,
            privateKey:
              serviceAccount.private_key.replace(
                /\\n/g,
                "\n"
              )
          })
        });

  return firebaseAdminApp;
}


export function getFirebaseDb() {
  getFirebaseAdminApp();

  return getFirestore();
}


export function getFirebaseStatus() {
  try {
    getFirebaseAdminApp();

    return {
      connected: true,
      projectId:
        process.env.FIREBASE_PROJECT_ID
    };
  } catch (error) {
    return {
      connected: false,
      error:
        error.message
    };
  }
}
