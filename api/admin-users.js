import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    ),
  });
}

export default async function handler(req, res) {
  if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = admin.firestore();
  const usersSnapshot = await db.collection('users').get();

  const users = await Promise.all(
    usersSnapshot.docs.map(async userDoc => {
      const info = await userDoc.ref.collection('registry').doc('info').get();
      if (!info.exists) return null;
      return { uid: userDoc.id, ...info.data() };
    })
  );

  res.json({ users: users.filter(Boolean) });
}
