// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCnoBUogE4MPfmZje8luNc2nJNMZPZkaOQ",
  authDomain: "hs-app-704ad.firebaseapp.com",
  projectId: "hs-app-704ad",
  storageBucket: "hs-app-704ad.firebasestorage.app",
  messagingSenderId: "1042148455853",
  appId: "1:1042148455853:web:d197b2afdf516e15109d24",
  measurementId: "G-HVHVMZMXMN"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Sign in function
function signIn() {
  // Using modern promise-based approach instead of deprecated method
  auth.signInWithEmailAndPassword('test@test.com', '123456')
    .then((userCredential) => {
      console.log("Signed in successfully:", userCredential.user);
    })
    .catch((error) => {
      console.error("Sign in error:", error.code, error.message);
    });
}

// Sign out function
function signOut() {
  auth.signOut()
    .then(() => {
      console.log("Signed out successfully");
    })
    .catch((error) => {
      console.error("Sign out error:", error);
    });
}

// Auth state observer
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById('name').textContent = user.email || user.displayName || 'User Signed In';
    console.log("User is signed in:", user);
  } else {
    document.getElementById('name').textContent = 'No one signed in';
    console.log("No user is signed in");
  }
});
function getBalance() {
  db.collection('users')
    .doc('testUser')
    .collection('balances')
    .doc('Kindness')
    .get()
    .then(doc => {
      if (doc.exists && doc.data()) {
        const amount = doc.data().amount;
        console.log('Kindness: ' + amount);
        // Assuming you want to update the name element based on your HTML
        document.getElementById('name').innerText = 
          'Loading... | Kindness: ' + amount;
      } else {
        console.log('No such document!');
      }
    })
    .catch(err => {
      console.log('Error: ', err);
    });
}
function showTransactions() {
  db.collection("transactions")
    .orderBy("timestamp", "desc")
    .limit(5)
    .get()
    .then(snapshot => {
      let html = '';
      if (snapshot.empty) {
        html = 'No transactions found';
      } else {
        snapshot.forEach(doc => {
          const d = doc.data();
          html += `
            <div class="transaction-item">
              ${d.emoji || ''} ${d.amount || ''} ${d.feelingType || ''}<br>
              from ${d.fromUID?.slice(0,4)}... → ${d.toUID?.slice(0,4)}...<br>
              (${d.reason || ''})
            </div><hr>`;
        });
      }
      document.getElementById('name').innerHTML = html; // Use innerHTML for HTML content
    })
    .catch(error => {
      console.error('Error fetching transactions:', error);
      document.getElementById('name').innerHTML = 'Error loading transactions';
    });
}
async function checkBalance(uid = 'abc123') { // Remove default after auth integration
  try {
    const docRef = db.collection('users').doc(uid).collection('balances');
    const snap = await docRef.get();
    
    if (snap.empty) {
      document.getElementById('name').innerHTML = 'No balances found';
      return 0;
    }
    
    let total = 0;
    snap.forEach(d => {
      const amount = d.data()?.amount;
      if (typeof amount === 'number') {
        total += amount;
      }
    });
    
    // Replace entire content instead of appending
    const currentContent = document.getElementById('name').innerHTML || '';
    document.getElementById('name').innerHTML = 
      `${currentContent}<br>Your total hours: ${total}`;
      
    return total;
  } catch (error) {
    console.error('Error checking balance:', error);
    document.getElementById('name').innerHTML = 'Error loading balance';
    return 0;
  }
}
async function sendTest() {
  try {
    const batch = db.batch();
    const myRef = db.collection('users').doc('abc123').collection('balances').doc('Grateful');
    const theirRef = db.collection('users').doc('testUser').collection('balances').doc('Grateful');

    // Get sender's current balance
    const myDoc = await myRef.get();
    const currentAmount = myDoc.exists ? myDoc.data().amount : 0;

    if (currentAmount < 2) {
      alert('Not enough hours available!');
      return;
    }

    // Prepare batch operations
    batch.update(myRef, { amount: firebase.firestore.FieldValue.increment(-2) });
    batch.update(theirRef, { amount: firebase.firestore.FieldValue.increment(2) });

    // Add transaction record
    batch.set(db.collection('transactions').doc(), {
      fromUID: 'abc123',
      toUID: 'testUser',
      amount: 2,
      feelingType: 'Grateful',
      emoji: '🍕',
      reason: 'Pizza delivered',
      timestamp: firebase.firestore.Timestamp.now(),
      status: 'confirmed'
    });

    // Execute batch operation
    await batch.commit();
    alert('Transfer completed successfully!');
    
    // Update UI
    showTransactions();
    checkBalance();
    
  } catch (error) {
    console.error('Transfer failed:', error);
    alert('Transfer failed. Please try again.');
  }
}
async function sendReal() {
  try {
    // Validate inputs
    const fromUID = document.getElementById('from').value.trim();
    const toUID = document.getElementById('to').value.trim();
    const amountInput = document.getElementById('amount').value;
    const feeling = document.getElementById('feeling').value;
    const emoji = document.getElementById('emoji').value.trim();
    const reason = document.getElementById('reason').value.trim();

    // Input validation
    if (!fromUID || !toUID || !feeling || !emoji || !reason) {
      alert('All fields are required!');
      return;
    }

    const amount = parseInt(amountInput);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive number for amount');
      return;
    }

    if (fromUID === toUID) {
      alert('Sender and receiver cannot be the same');
      return;
    }

    // Create batch operation
    const batch = db.batch();
    const fromRef = db.collection('users').doc(fromUID).collection('balances').doc(feeling);
    const toRef = db.collection('users').doc(toUID).collection('balances').doc(feeling);

    // Check sender's balance
    const fromDoc = await fromRef.get();
    const currentAmount = fromDoc.exists ? fromDoc.data().amount : 0;

    if (currentAmount < amount) {
      alert(`Insufficient balance. Current: ${currentAmount}, Requested: ${amount}`);
      return;
    }

    // Prepare batch operations
    batch.update(fromRef, { amount: firebase.firestore.FieldValue.increment(-amount) });
    batch.update(toRef, { amount: firebase.firestore.FieldValue.increment(amount) });

    // Add transaction record
    const txRef = db.collection('transactions').doc();
    batch.set(txRef, {
      fromUID,
      toUID,
      amount,
      feelingType: feeling,
      emoji,
      reason,
      timestamp: firebase.firestore.Timestamp.now(),
      status: 'confirmed'
    });

    // Execute batch
    await batch.commit();
    alert('Transfer completed successfully!');
    
    // Update UI
    showTransactions();
    checkBalance(fromUID); // Only need to check one user's balance
    
  } catch (error) {
    console.error('Transfer failed:', error);
    alert('Transfer failed. Please try again.');
  }
}

// Load initial balances and transactions
checkBalance('abc123');
checkBalance('testUser');
showTransactions();