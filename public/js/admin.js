// js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    // Pastikan Firebase telah dimuatkan
    if (typeof firebase === 'undefined') {
        console.error("Firebase tidak dimuatkan.");
        return;
    }

    const auth = firebase.auth();
    const db = firebase.firestore();
    // const storage = firebase.storage(); // Diperlukan jika admin perlu memuat naik/padam

    // --- LOGIK UNTUK HALAMAN LOGIN (admin-login.html) ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        
        // Jika admin sudah login, hantar terus ke dashboard
        auth.onAuthStateChanged(user => {
            if (user) {
                window.location.href = 'admin-dashboard.html';
            }
        });

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;
            const errorEl = document.getElementById('login-error');
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
            errorEl.style.display = 'none';

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Berjaya login
                    console.log("Admin login berjaya:", userCredential.user.email);
                    window.location.href = 'admin-dashboard.html';
                })
                .catch((error) => {
                    // Gagal login
                    console.error("Ralat login:", error.message);
                    errorEl.textContent = "Login gagal: Sila semak email dan kata laluan anda.";
                    errorEl.style.display = 'block';
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Login';
                });
        });
    }

    // --- LOGIK UNTUK HALAMAN DASHBOARD (admin-dashboard.html) ---
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
        const logoutBtn = document.getElementById('logout-btn');
        const orderListBody = document.getElementById('order-list-body');
        const orderCount = document.getElementById('order-count');

        // Ini adalah "Route Protection"
        // Semak status login setiap kali halaman dashboard dimuatkan
        auth.onAuthStateChanged(user => {
            if (user) {
                // Admin disahkan, muatkan data
                console.log("Admin disahkan:", user.email);
                loadOrderData(db, orderListBody, orderCount);
            } else {
                // Tiada admin yang login, tendang keluar!
                console.log("Tiada akses. Menghala ke login.");
                alert("Anda perlu login untuk mengakses halaman ini.");
                window.location.href = 'admin-login.html';
            }
        });

        // Fungsi untuk logout
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log("Admin berjaya logout.");
                window.location.href = 'admin-login.html';
            }).catch((error) => {
                console.error("Ralat semasa logout:", error);
            });
        });

        // ▼ DIUBAH: Fungsi untuk muatkan data tempahan (termasuk pautan fail) ▼
        async function loadOrderData(db, orderListBody, orderCount) {
            if (!orderListBody) return;

            try {
                // Ambil data dari koleksi 'tempahanBerjaya'
                const snapshot = await db.collection("tempahanBerjaya")
                                          .orderBy("tarikhTempahan", "desc") // Susun ikut yang terbaru
                                          .get();
                
                if (snapshot.empty) {
                    orderListBody.innerHTML = '<tr><td colspan="7">Tiada data tempahan ditemui.</td></tr>'; // Ubah colspan ke 7
                    orderCount.textContent = '(0 Tempahan)';
                    return;
                }

                let html = '';
                snapshot.forEach(doc => {
                    const data = doc.data();
                    
                    // Cipta pautan dokumen (jika wujud)
                    const docLinks = `
                        <div class="doc-links">
                            ${data.url1 ? `<a href="${data.url1}" target="_blank">Borang</a>` : ''}
                            ${data.url2 ? `<a href="${data.url2}" target="_blank">Slip</a>` : ''}
                            ${data.url3 ? `<a href="${data.url3}" target="_blank">SPKG</a>` : ''}
                            ${data.url4 ? `<a href="${data.url4}" target="_blank">S.Kuasa</a>` : ''}
                        </div>
                    `;

                    // Cipta satu baris (row) untuk setiap tempahan
                    html += `
                        <tr>
                            <td>${data.fullName}</td>
                            <td>${data.matricNo}</td>
                            <td>${data.serviceText}</td>
                            <td>${parseFloat(data.price).toFixed(2)}</td>
                            <td>${data.address}</td>
                            <td>${docLinks}</td>
                        </tr>
                    `;
                });

                orderListBody.innerHTML = html;
                orderCount.textContent = `(${snapshot.size} Tempahan)`;

            } catch (error) {
                console.error("Ralat memuatkan data tempahan:", error);
                orderListBody.innerHTML = `<tr><td colspan="7">Ralat: Gagal memuatkan data.</td></tr>`; // Ubah colspan ke 7
            }
        }
        // ▲ TAMAT FUNGSI YANG DIUBAH ▲
    }
});