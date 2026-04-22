import { db, collection, getDocs } from './src/firebase';
async function test() {
  const snapshot = await getDocs(collection(db, 'posts'));
  console.log('Posts count:', snapshot.size);
}
test().catch(console.error);
