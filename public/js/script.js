// js/script.js

// 🛑 KONFIGURASI TOYYIBPAY (KOD KATEGORI INI MUNGKIN HANYA UNTUK CLOUD FUNCTION SEKARANG)
// const TOYYIBPAY_CATEGORY_CODE = 'bn5tl2it'; // Anda telah tetapkan ini dalam Cloud Function Config
const WEBSITE_BASE_URL = 'https://projek-servis-jubah.web.app/'; // URL Firebase Hosting anda
// 🛑 TAMAT KONFIGURASI

document.addEventListener('DOMContentLoaded', function() {

    // Fungsi untuk menyimpan data dalam localStorage
    const saveToLocalStorage = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const getFromLocalStorage = (key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    };

    // ===============================================
    // LOGIK UNTUK HALAMAN 2: PILIH SERVIS
    // ===============================================
    if (document.getElementById('service-form')) {
        const serviceForm = document.getElementById('service-form');
        const serviceOptions = document.querySelectorAll('.service-option');
        const totalPriceEl = document.getElementById('total-price');

        // --- KOD UNTUK SEMAK KUOTA DARI FIREBASE ---
        async function semakKuotaServis() {
            if (typeof db === 'undefined') {
                console.error("Firebase DB tidak dijumpai.");
                alert("Gagal menyambung ke pangkalan data. Sila muat semula.");
                return;
            }
            try {
                const submitBtn = serviceForm.querySelector('button[type="submit"]');
                if(submitBtn) submitBtn.textContent = 'Menyemak Kuota...';
                if(submitBtn) submitBtn.disabled = true;

                const snapshot = await db.collection("tempahanBerjaya").get();
                let kuotaPengambilan = 0; // Limit 5
                let kuotaPenghantaran = 0; // Limit 10
                const servisList = {
                    pengambilan: ["90", "105"],
                    penghantaran: ["65"],
                    ambigu50Pengambilan: "Pengambilan Jubah",
                    ambigu50Penghantaran: "Penghantaran Jubah"
                };

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const price = data.price;
                    const text = data.serviceText;
                    if (servisList.pengambilan.includes(price) || (price === "50" && text === servisList.ambigu50Pengambilan)) {
                        kuotaPengambilan++;
                    } else if (servisList.penghantaran.includes(price) || (price === "50" && text === servisList.ambigu50Penghantaran)) {
                        kuotaPenghantaran++;
                    }
                });

                const radios = serviceForm.querySelectorAll('input[name="service"]');
                radios.forEach(radio => {
                    const val = radio.value;
                    const text = radio.getAttribute('data-text');
                    const label = radio.closest('.service-option');
                    let isPenuh = false;
                    if (servisList.pengambilan.includes(val) || (val === "50" && text === servisList.ambigu50Pengambilan)) {
                        if (kuotaPengambilan >= 5) isPenuh = true;
                    } else if (servisList.penghantaran.includes(val) || (val === "50" && text === servisList.ambigu50Penghantaran)) {
                        if (kuotaPenghantaran >= 10) isPenuh = true;
                    }
                    if (isPenuh) {
                        radio.disabled = true;
                        label.style.opacity = "0.5";
                        label.style.cursor = "not-allowed";
                        label.style.borderColor = "var(--error-color)";
                        if (!label.innerHTML.includes('KUOTA PENUH')) {
                             label.innerHTML += ' <strong style="color:var(--error-color); display: block; text-align: right; width: 100%;">(KUOTA PENUH)</strong>';
                        }
                    }
                });

                if(submitBtn) submitBtn.textContent = 'Seterusnya → Isi Maklumat';
                if(submitBtn) submitBtn.disabled = false;
            } catch (error) {
                console.error("Ralat semasa menyemak kuota: ", error);
                alert("Gagal menyemak kuota servis. Sila semak sambungan internet dan muat semula.");
                const submitBtn = serviceForm.querySelector('button[type="submit"]');
                if(submitBtn) submitBtn.textContent = 'Ralat Kuota. Muat Semula.';
            }
        }
        semakKuotaServis();
        // --- TAMAT KOD SEMAK KUOTA ---

        serviceForm.addEventListener('change', (e) => {
            if (e.target.name === 'service') {
                const price = parseFloat(e.target.value).toFixed(2);
                totalPriceEl.textContent = price;
                serviceOptions.forEach(opt => opt.classList.remove('selected'));
                e.target.closest('.service-option').classList.add('selected');
            }
        });

        serviceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const selectedService = serviceForm.querySelector('input[name="service"]:checked');
            if (!selectedService) {
                alert('Sila pilih satu servis.'); return;
            }
            const orderDetails = {
                serviceText: selectedService.getAttribute('data-text'), price: selectedService.value
            };
            saveToLocalStorage('orderDetails', orderDetails);
            window.location.href = 'isi-maklumat.html';
        });
    }

    // ===============================================
    // LOGIK UNTUK HALAMAN 3: ISI MAKLUMAT & UPLOAD
    // ===============================================
    if (document.getElementById('info-form')) {
        const infoForm = document.getElementById('info-form');
        const uploadAreas = document.querySelectorAll('.file-upload-area');

        // --- FUNGSI UNTUK MUAT NAIK KE FIREBASE STORAGE ---
        async function uploadFileToStorage(file, path) {
            if (typeof firebase.storage === 'undefined') {
                throw new Error("Firebase Storage tidak dimuatkan.");
            }
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(path);
            const snapshot = await fileRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            return downloadURL;
        }
        // --- TAMAT FUNGSI MUAT NAIK ---

        uploadAreas.forEach(area => {
            const fileInput = area.querySelector('.file-input');
            const statusId = `status-${area.id.split('-')[1]}`;
            const statusEl = document.getElementById(statusId);
            area.addEventListener('click', () => fileInput.click());
            area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('drag-over'); });
            area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
            area.addEventListener('drop', (e) => {
                e.preventDefault(); area.classList.remove('drag-over');
                if (e.dataTransfer.files.length > 0) {
                    fileInput.files = e.dataTransfer.files;
                    handleFile(e.dataTransfer.files[0], statusEl);
                }
            });
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) handleFile(fileInput.files[0], statusEl);
            });
        });

        function handleFile(file, statusEl) {
            if (!file) { statusEl.innerHTML = ''; return; } // Kosongkan status jika fail dibuang
            if (file.type !== 'application/pdf') {
                statusEl.innerHTML = `<span style="color: var(--error-color);">Ralat: PDF sahaja.</span>`;
                return;
            }
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                 statusEl.innerHTML = `<span style="color: var(--error-color);">Ralat: Saiz > 10MB.</span>`;
                 return;
            }
            statusEl.innerHTML = `<span>${file.name}</span> <div style="width:100%;background:#333;border-radius:5px;margin-top:5px;"><div class="progress-bar" style="width:0%;height:5px;border-radius:5px;"></div></div>`;
            let width = 0;
            const interval = setInterval(() => {
                if (width >= 100) { clearInterval(interval); statusEl.innerHTML = `✅ ${file.name} disahkan.`; }
                else { width++; statusEl.querySelector('.progress-bar').style.width = width + '%'; }
            }, 10);
        }

        // --- FUNGSI SUBMIT DENGAN MUAT NAIK SEBENAR ---
        infoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = infoForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true; submitBtn.textContent = 'Memproses...';
            try {
                const formData = {
                    fullName: document.getElementById('full-name').value, matricNo: document.getElementById('matric-no').value,
                    phoneNo: document.getElementById('phone-no').value, fakulti: document.getElementById('fakulti').value,
                    address: document.getElementById('address').value, deliveryTime: document.getElementById('delivery-time').value,
                };
                const file1 = document.querySelector('[name="file1"]').files[0]; const file2 = document.querySelector('[name="file2"]').files[0];
                const file3 = document.querySelector('[name="file3"]').files[0]; const file4 = document.querySelector('[name="file4"]').files[0];

                if (!file1 || !file2 || !file3 || !file4) {
                    alert("Sila muat naik kesemua 4 dokumen PDF."); throw new Error("Dokumen tidak lengkap");
                }
                const matricNo = formData.matricNo;
                if (!matricNo) { alert("Sila isi Nombor Matrik."); throw new Error("No Matrik tiada"); }

                const fileURLs = {};
                submitBtn.textContent = 'Muat Naik 1/4...'; fileURLs.url1 = await uploadFileToStorage(file1, `uploads/${matricNo}/borang-semak.pdf`);
                submitBtn.textContent = 'Muat Naik 2/4...'; fileURLs.url2 = await uploadFileToStorage(file2, `uploads/${matricNo}/slip-tempahan.pdf`);
                submitBtn.textContent = 'Muat Naik 3/4...'; fileURLs.url3 = await uploadFileToStorage(file3, `uploads/${matricNo}/spkg-alumni.pdf`);
                submitBtn.textContent = 'Muat Naik 4/4...'; fileURLs.url4 = await uploadFileToStorage(file4, `uploads/${matricNo}/surat-kuasa.pdf`);
                submitBtn.textContent = 'Selesai. Menghantar...';

                saveToLocalStorage('formData', formData);
                saveToLocalStorage('fileURLs', fileURLs);
                window.location.href = 'semak-pesanan.html';
            } catch (error) {
                console.error("Ralat muat naik fail: ", error);
                alert("Maaf, ralat muat naik fail: " + error.message);
                submitBtn.disabled = false; submitBtn.textContent = 'Semak Maklumat → Page 4';
            }
        });
        // --- TAMAT FUNGSI SUBMIT ---
    }

    // =======================================================
    // LOGIK UNTUK HALAMAN 4: SEMAK PESANAN (MEMANGGIL CLOUD FUNCTION)
    // =======================================================
    if (document.getElementById('confirmation-form')) {
        const orderDetails = getFromLocalStorage('orderDetails');
        const formData = getFromLocalStorage('formData');
        const fileURLs = getFromLocalStorage('fileURLs');

        if (formData) {
            document.getElementById('summary-name').textContent = formData.fullName; document.getElementById('summary-matric').textContent = formData.matricNo;
            document.getElementById('summary-phone').textContent = formData.phoneNo; document.getElementById('summary-fakulti').textContent = formData.fakulti;
            document.getElementById('summary-address').textContent = formData.address; document.getElementById('summary-delivery').textContent = formData.deliveryTime;
        }
        if (orderDetails) {
            document.getElementById('selected-service').textContent = orderDetails.serviceText;
            document.getElementById('final-price').textContent = `RM ${parseFloat(orderDetails.price).toFixed(2)}`;
        }
        const fileList = document.getElementById('uploaded-files');
        if (fileURLs) {
            fileList.innerHTML = `<li>✅ <a href="${fileURLs.url1}" target="_blank">Borang Semak</a></li> <li>✅ <a href="${fileURLs.url2}" target="_blank">Slip Tempahan</a></li> <li>✅ <a href="${fileURLs.url3}" target="_blank">SPKG & Alumni</a></li> <li>✅ <a href="${fileURLs.url4}" target="_blank">Surat Kuasa</a></li>`;
        } else {
            fileList.innerHTML = `<li><strong style="color:var(--error-color)">Ralat: Dokumen tidak ditemui. Sila kembali.</strong></li>`;
        }

        const confirmCheckbox = document.getElementById('confirm-checkbox');
        const paymentBtn = document.getElementById('payment-btn');
        if (paymentBtn) paymentBtn.disabled = true;
        confirmCheckbox.addEventListener('change', () => { paymentBtn.disabled = !confirmCheckbox.checked; });

        // --- EVENT LISTENER SUBMIT BARU (MEMANGGIL CLOUD FUNCTION) ---
        document.getElementById('confirmation-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (confirmCheckbox.checked && formData && orderDetails && fileURLs) {
                paymentBtn.disabled = true; paymentBtn.textContent = 'Mencipta Bil...';
                try {
                    if (typeof firebase.functions === 'undefined') {
                       throw new Error("Komponen pembayaran tidak tersedia. Sila muat semula.");
                    }
                    const functionData = {
                        billName: `Tempahan Jubah - ${formData.matricNo}`, billDescription: orderDetails.serviceText,
                        billAmount: Math.round(parseFloat(orderDetails.price) * 100), billTo: formData.fullName,
                        billEmail: `${formData.matricNo}@unimas.my`, billPhone: formData.phoneNo,
                        billReturnUrl: `${WEBSITE_BASE_URL}pembayaran.html`, billCallbackUrl: `${WEBSITE_BASE_URL}pembayaran.html`
                    };
                    console.log("Memanggil Cloud Function 'createToyyibpayBill':", functionData);
                    const createBillFunction = firebase.functions().httpsCallable('createToyyibpayBill');
                    const result = await createBillFunction(functionData);
                    console.log("Respons Cloud Function:", result);

                    if (result.data && result.data.billCode) {
                        const billCode = result.data.billCode;
                        console.log("BillCode diterima:", billCode);
                        // PENTING: Pastikan URL ini sepadan dengan environment Cloud Function anda!
                        const TOYYIBPAY_PAYMENT_BASE_URL = "https://dev.toyyibpay.com/"; // Untuk UJIAN
                        // const TOYYIBPAY_PAYMENT_BASE_URL = "https://toyyibpay.com/"; // Untuk LIVE
                        const paymentUrl = `${TOYYIBPAY_PAYMENT_BASE_URL}${billCode}`;
                        paymentBtn.textContent = 'Menghala ke Pembayaran...';
                        console.log("Menghala ke URL ToyyibPay:", paymentUrl);
                        window.location.href = paymentUrl;
                    } else {
                        throw new Error("Gagal mendapatkan kod bil dari server.");
                    }
                } catch (error) {
                    console.error("Ralat proses pembayaran:", error);
                    alert(`Maaf, gagal mencipta bil: ${error.message}`);
                    paymentBtn.disabled = false; paymentBtn.textContent = 'Teruskan ke Pembayaran';
                }
            } else if (!formData || !orderDetails || !fileURLs) {
                alert("Ralat data: Maklumat tempahan atau dokumen hilang. Sila cuba proses tempahan semula.");
                paymentBtn.disabled = false;
            } else {
                alert("Sila tandakan kotak pengesahan.");
                paymentBtn.disabled = false; // Aktifkan semula jika hanya checkbox belum ditanda
            }
        });
        // --- TAMAT EVENT LISTENER SUBMIT BARU ---
    }

    // ===========================================================
    // LOGIK UNTUK HALAMAN 5: PEMBAYARAN (Menerima status ToyyibPay)
    // ===========================================================
    if (document.querySelector('.payment-container')) {
        const urlParams = new URLSearchParams(window.location.search);
        // PERHATIAN: ToyyibPay menghantar 'status_id' dan 'billcode' dalam Return URL, BUKAN 'status' sahaja.
        const status = urlParams.get('status_id'); // Guna status_id dari Return URL
        const billCodeParam = urlParams.get('billcode'); // Ambil billcode juga jika perlu pengesahan

        const loadingSection = document.getElementById('loading-section');
        const successSection = document.getElementById('success-section');
        const failureSection = document.getElementById('failure-section');

        if (loadingSection) loadingSection.style.display = 'none';
        if (successSection) successSection.style.display = 'none';
        if (failureSection) failureSection.style.display = 'none';

        if (status === '1') { // Status 1 = Berjaya
            if (successSection) successSection.style.display = 'block';
            if (typeof confetti === 'function') { /* kod confetti */
                const myCanvas = document.getElementById('confetti-canvas');
                const myConfetti = confetti.create(myCanvas, { resize: true, useWorker: true });
                myConfetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
            }
            // --- SIMPAN DATA KE FIRESTORE SELEPAS BERJAYA ---
            try {
                const orderDetails = getFromLocalStorage('orderDetails');
                const formData = getFromLocalStorage('formData');
                const fileURLs = getFromLocalStorage('fileURLs');
                if (orderDetails && formData && fileURLs && typeof db !== 'undefined') {
                    const finalOrderData = {
                        ...formData, ...orderDetails, ...fileURLs,
                        statusPembayaran: 'berjaya',
                        kodBilToyyibpay: billCodeParam || 'N/A', // Simpan kod bil jika ada
                        tarikhTempahan: new Date().toISOString()
                    };
                    db.collection("tempahanBerjaya").add(finalOrderData)
                        .then(docRef => console.log("Tempahan disimpan ke Firestore:", docRef.id))
                        .catch(error => console.error("Ralat simpan ke Firestore:", error));
                } else { console.warn("Data tidak lengkap di localStorage untuk simpan ke Firestore."); }
            } catch (e) { console.error("Ralat semasa cuba simpan ke Firestore:", e); }
            // --- TAMAT SIMPAN DATA ---
        } else if (status === '3' || status === '2') { // Status 3 = Gagal, Status 2 = Pending (anggap gagal sementara)
            if (failureSection) failureSection.style.display = 'block';
        } else { // Jika tiada status_id atau nilai lain
            if (loadingSection) loadingSection.style.display = 'block';
            console.warn("Status pembayaran tidak dikenali atau tiada:", status);
            // Anda mungkin mahu tunjukkan mesej ralat atau loading di sini
            // Untuk demo, kita tunjuk loading kemudian gagal selepas timeout
             setTimeout(() => {
                if (loadingSection) loadingSection.style.display = 'none';
                if (failureSection) failureSection.style.display = 'block';
                 // Anda mungkin mahu log ralat ini ke sistem monitoring anda
            }, 5000);
        }

        // Logik untuk muat turun resit PDF
        const downloadBtn = document.getElementById('download-receipt');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                try {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF();
                    const orderDetails = getFromLocalStorage('orderDetails');
                    const formData = getFromLocalStorage('formData');
                    if (!orderDetails || !formData) {
                        alert("Data tempahan tidak ditemui untuk menjana resit."); return;
                    }
                    const today = new Date();
                    const dateString = `${today.getDate()} ${today.toLocaleString('ms-MY', { month: 'long' })} ${today.getFullYear()}`;

                    // --- KOD JANA PDF (Sama seperti sebelum ini) ---
                    doc.setFontSize(18); doc.setTextColor('#0b132b'); doc.text("RESIT PEMBAYARAN", 105, 20, null, null, "center");
                    doc.setFontSize(12); doc.text("Servis Pengambilan & Penghantaran Jubah", 105, 28, null, null, "center");
                    doc.setDrawColor('#ffd700'); doc.line(20, 35, 190, 35);
                    doc.setTextColor('#333'); doc.text("Tarikh Pembayaran:", 20, 45); doc.text(dateString, 80, 45);
                    doc.text("No. Rujukan Bil:", 20, 52); doc.text(billCodeParam || `TYP-${Date.now().toString().slice(-6)}`, 80, 52); // Guna billCode jika ada
                    doc.text("Kaedah Bayaran:", 20, 59); doc.text("FPX (ToyyibPay)", 80, 59); doc.line(20, 66, 190, 66);
                    doc.setFontSize(14); doc.setTextColor('#0b132b'); doc.text("Butiran Pelanggan", 20, 76);
                    doc.setFontSize(12); doc.setTextColor('#333'); doc.text("Nama Penuh:", 20, 85); doc.text(formData.fullName, 80, 85);
                    doc.text("No. Matrik:", 20, 92); doc.text(formData.matricNo, 80, 92); doc.text("No. Telefon:", 20, 99); doc.text(formData.phoneNo, 80, 99);
                    doc.text("Fakulti:", 20, 106); doc.text(formData.fakulti, 80, 106); doc.line(20, 113, 190, 113);
                    doc.setFontSize(14); doc.setTextColor('#0b132b'); doc.text("Servis Dipilih", 20, 123);
                    doc.setFontSize(12); doc.setTextColor('#333'); doc.text(`> ${orderDetails.serviceText}`, 20, 132);
                    doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.setTextColor('#0b132b'); doc.text("Jumlah Bayaran:", 20, 147);
                    doc.text(`RM${parseFloat(orderDetails.price).toFixed(2)}`, 190, 147, null, null, "right");
                    doc.text("Status Pembayaran:", 20, 154); doc.setTextColor('#28a745'); doc.text("BERJAYA", 190, 154, null, null, "right");
                    doc.setFont(undefined, 'normal'); doc.line(20, 162, 190, 162);
                    doc.setFontSize(10); doc.setTextColor('#555'); doc.text("Rujukan Dokumen (Disimpan dalam sistem):", 20, 172);
                    doc.text("- Borang Semak, Slip Tempahan, SPKG, Surat Kuasa", 20, 178);
                    doc.text("Syabas dan tahniah kepada para graduan.", 105, 188, null, null, "center");
                    doc.text("Terima kasih kerana menggunakan servis kami.", 105, 193, null, null, "center");
                    doc.text("Semoga hari konvokesyen anda penuh makna 🎓✨", 105, 198, null, null, "center");
                    doc.setDrawColor('#ffd700'); doc.line(20, 270, 190, 270); doc.setTextColor('#0b132b'); doc.text("UNIMAS | Graduasi 2025", 105, 278, null, null, "center");
                    // --- TAMAT KOD JANA PDF ---

                    doc.save(`resit-pembayaran-${formData.matricNo || 'N_A'}.pdf`);

                    // Penting: Hanya padam selepas resit berjaya dijana/disimpan
                    localStorage.removeItem('orderDetails');
                    localStorage.removeItem('formData');
                    localStorage.removeItem('fileURLs');
                } catch (pdfError) {
                    console.error("Ralat semasa menjana PDF:", pdfError);
                    alert("Maaf, gagal menjana resit PDF. Sila cuba muat turun semula.");
                }
            });
        }
    }
});