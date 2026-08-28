import { getFirestore } from 'firebase-admin/firestore';
console.log(typeof getFirestore().collection('users').listDocuments);
