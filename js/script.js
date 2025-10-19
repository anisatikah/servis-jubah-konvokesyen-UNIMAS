// js/script.js

// 🛑 KONFIGURASI TOYYIBPAY TELAH DIKEMASKINI DENGAN NILAI SEBENAR ANDA
const TOYYIBPAY_CATEGORY_CODE = 'pbud1r05'; 
const WEBSITE_BASE_URL = 'https://projek-servis-jubah.web.app/'; // URL Firebase Hosting anda
// 🛑 TAMAT KONFIGURASI

document.addEventListener('DOMContentLoaded', function() {
    
    // Fungsi untuk menyimpan data dalam localStorage (untuk hantar antara halaman)
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

        // --- KOD BARU UNTUK SEMAK KUOTA DARI FIREBASE ---
        async function semakKuotaServis() {
            // Pastikan 'db' wujud (dari firebase-config.js)
            if (typeof db === 'undefined') {
                console.error("Firebase DB tidak dijumpai. Tidak dapat semak kuota.");
                alert("Gagal menyambung ke pangkalan data untuk semakan kuota. Sila muat semula.");
                return;
            }

            try {
                // Tunjukkan 'loading' pada butang semasa kuota disemak
                const submitBtn = serviceForm.querySelector('button[type="submit"]');
                if(submitBtn) submitBtn.textContent = 'Menyemak Kuota...';
                if(submitBtn) submitBtn.disabled = true;

                const snapshot = await db.collection("tempahanBerjaya").get();
                let kuotaPengambilan = 0; // Limit 5
                let kuotaPenghantaran = 0; // Limit 10

                const servisList = {
                    pengambilan: ["90", "105"], // Servis yang confirm ada 'Pengambilan'
                    penghantaran: ["65"],      // Servis yang confirm 'Penghantaran' sahaja
                    ambigu50Pengambilan: "Pengambilan Jubah", // Servis RM50 (Pengambilan)
                    ambigu50Penghantaran: "Penghantaran Jubah" // Servis RM50 (Penghantaran)
                };

                // 1. Kira kuota sedia ada
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const price = data.price; // Ini ialah 'value' dari radio button
                    const text = data.serviceText; // Ini ialah 'data-text'

                    // Semak Kategori A (Limit 5: Ada 'Pengambilan')
                    if (servisList.pengambilan.includes(price) || (price === "50" && text === servisList.ambigu50Pengambilan)) {
                        kuotaPengambilan++;
                    } 
                    // Semak Kategori B (Limit 10: 'Penghantaran' sahaja)
                    else if (servisList.penghantaran.includes(price) || (price === "50" && text === servisList.ambigu50Penghantaran)) {
                        kuotaPenghantaran++;
                    }
                });

                // 2. Lumpuhkan (disable) radio button jika kuota penuh
                const radios = serviceForm.querySelectorAll('input[name="service"]');
                
                radios.forEach(radio => {
                    const val = radio.value;
                    const text = radio.getAttribute('data-text');
                    const label = radio.closest('.service-option');
                    
                    let isPenuh = false;

                    // Semak Kategori A (Pengambilan)
                    if (servisList.pengambilan.includes(val) || (val === "50" && text === servisList.ambigu50Pengambilan)) {
                        if (kuotaPengambilan >= 5) {
                            isPenuh = true;
                        }
                    }
                    // Semak Kategori B (Penghantaran)
                    else if (servisList.penghantaran.includes(val) || (val === "50" && text === servisList.ambigu50Penghantaran)) {
                        if (kuotaPenghantaran >= 10) {
                            isPenuh = true;
                        }
                    }

                    // Jika penuh, lumpuhkan butang radio
                    if (isPenuh) {
                        radio.disabled = true;
                        label.style.opacity = "0.5";
                        label.style.cursor = "not-allowed";
                        label.style.borderColor = "var(--error-color)";
                        // Tambah teks "KUOTA PENUH" - elak tambah berulang kali
                        if (!label.innerHTML.includes('KUOTA PENUH')) {
                             label.innerHTML += ' <strong style="color:var(--error-color); display: block; text-align: right; width: 100%;">(KUOTA PENUH)</strong>';
                        }
                    }
                });

                // Kembalikan butang kepada keadaan asal selepas semakan selesai
                if(submitBtn) submitBtn.textContent = 'Seterusnya → Isi Maklumat';
                if(submitBtn) submitBtn.disabled = false;

            } catch (error) {
                console.error("Ralat semasa menyemak kuota: ", error);
                alert("Gagal menyemak kuota servis. Sila semak sambungan internet anda dan muat semula halaman.");
                const submitBtn = serviceForm.querySelector('button[type="submit"]');
                if(submitBtn) submitBtn.textContent = 'Ralat Kuota. Muat Semula.';
            }
        }
        
        // Panggil fungsi semak kuota sebaik sahaja DOM sedia
        semakKuotaServis();
        // --- TAMAT KOD BARU ---


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
                alert('Sila pilih satu servis.');
                return;
            }
            
            const orderDetails = {
                serviceText: selectedService.getAttribute('data-text'),
                price: selectedService.value
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

        // Logik untuk muat naik fail (drag & drop)
        uploadAreas.forEach(area => {
            const fileInput = area.querySelector('.file-input');
            const idParts = area.id.split('-');
            const statusId = idParts.length > 1 ? `status-${idParts[1]}` : null;
            const statusEl = statusId ? document.getElementById(statusId) : null;

            area.addEventListener('click', () => fileInput.click());
            area.addEventListener('dragover', (e) => {
                e.preventDefault();
                area.classList.add('drag-over');
            });
            area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    // Direct assignment to fileInput.files is not supported in most browsers.
                    // Instead, prompt the user to select the file via the input element.
                    alert('Sila klik untuk memilih fail secara manual.');
                    // Optionally, you can set a preview or handle the file directly:
                    handleFile(files[0], statusEl);
                }
            });
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    handleFile(fileInput.files[0], statusEl);
                }
            });
        });
        
        function handleFile(file, statusEl) {
            if (file.type !== 'application/pdf') {
                statusEl.innerHTML = `<span style="color: var(--error-color);">Ralat: Sila muat naik fail PDF sahaja.</span>`;
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                 statusEl.innerHTML = `<span style="color: var(--error-color);">Ralat: Saiz fail tidak boleh melebihi 5MB.</span>`;
                 return;
            }
            statusEl.innerHTML = `
                <span>${file.name}</span>
                <div style="width: 100%; background: #333; border-radius: 5px; margin-top: 5px;">
                    <div class="progress-bar" style="width: 0%; height: 5px; border-radius: 5px;"></div>
                </div>`;
            let width = 0;
            const interval = setInterval(() => {
                if (width >= 100) {
                    clearInterval(interval);
                    statusEl.innerHTML = `✅ ${file.name} berjaya dimuat naik.`;
                } else {
                    width++;
                    statusEl.querySelector('.progress-bar').style.width = width + '%';
                }
            }, 10);
        }
        
        // FUNGSI SUBMIT BORANG
        infoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
        
            const submitBtn = infoForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Menghantar...';
        
            try {
                const formData = {
                    fullName: document.getElementById('full-name').value,
                    matricNo: document.getElementById('matric-no').value,
                    phoneNo: document.getElementById('phone-no').value,
                    fakulti: document.getElementById('fakulti').value, 
                    address: document.getElementById('address').value,
                    deliveryTime: document.getElementById('delivery-time').value,
                };
                
                // JANGAN SIMPAN KE FIRESTORE DI SINI.
                // Kita hanya simpan selepas bayaran berjaya di halaman 5.
                // const orderDetails = getFromLocalStorage('orderDetails');
                // const finalOrderData = { ...formData, ...orderDetails }; 
                // await db.collection("tempahan").add(finalOrderData);
        
                saveToLocalStorage('formData', formData);
                
                const uploadedFileNames = {
                    file1: document.querySelector('[name="file1"]').files[0]?.name || 'Borang Semakan.pdf',
                    file2: document.querySelector('[name="file2"]').files[0]?.name || 'Slip Tempahan.pdf',
                    file3: document.querySelector('[name="file3"]').files[0]?.name || 'SPKG & Alumni.pdf',
                    file4: document.querySelector('[name="file4"]').files[0]?.name || 'Surat Kuasa.pdf',
                };
                saveToLocalStorage('fileNames', uploadedFileNames);

                window.location.href = 'semak-pesanan.html';
        
            } catch (error) {
                console.error("Ralat semasa menghantar tempahan: ", error);
                alert("Maaf, berlaku ralat semasa menghantar tempahan anda. Sila semak semula konfigurasi.");
                
                submitBtn.disabled = false;
                submitBtn.textContent = 'Semak Maklumat → Page 4';
            }
        });
    }

    // =======================================================
    // LOGIK UNTUK HALAMAN 4: SEMAK PESANAN (Memulakan ToyyibPay)
    // =======================================================
    if (document.getElementById('confirmation-form')) {
        const orderDetails = getFromLocalStorage('orderDetails');
        const formData = getFromLocalStorage('formData'); 
        const fileNames = getFromLocalStorage('fileNames');
        
        // Paparkan Data Borang (Personal & Delivery Info)
        if (formData) {
            document.getElementById('summary-name').textContent = formData.fullName;
            document.getElementById('summary-matric').textContent = formData.matricNo;
            document.getElementById('summary-phone').textContent = formData.phoneNo;
            document.getElementById('summary-fakulti').textContent = formData.fakulti;
            document.getElementById('summary-address').textContent = formData.address;
            document.getElementById('summary-delivery').textContent = formData.deliveryTime;
        }

        // Paparkan Data Servis & Harga
        if (orderDetails) {
            document.getElementById('selected-service').textContent = orderDetails.serviceText;
            document.getElementById('final-price').textContent = `RM ${parseFloat(orderDetails.price).toFixed(2)}`;
        }

        // Paparkan Status Muat Naik Dokumen
        if (fileNames) {
            const fileList = document.getElementById('uploaded-files');
            fileList.innerHTML = `
                <li>✅ ${fileNames.file1}</li>
                <li>✅ ${fileNames.file2}</li>
                <li>✅ ${fileNames.file3}</li>
                <li>✅ ${fileNames.file4}</li>
            `;
        }
        
        const confirmCheckbox = document.getElementById('confirm-checkbox');
        const paymentBtn = document.getElementById('payment-btn');

        if (paymentBtn) { 
            paymentBtn.disabled = true; 
        }

        confirmCheckbox.addEventListener('change', () => {
            paymentBtn.disabled = !confirmCheckbox.checked;
        });
        
        document.getElementById('confirmation-form').addEventListener('submit', (e) => {
            e.preventDefault();
            if (confirmCheckbox.checked && formData && orderDetails) {
                
                // 🛑 PANGGILAN KE TOYYIBPAY
                
                // Kita tidak perlu semak lagi kerana nilai telah ditetapkan di atas
                
                const amountInCents = Math.round(parseFloat(orderDetails.price) * 100);
                const redirectURL = `${WEBSITE_BASE_URL}pembayaran.html`;
                const billDescription = `Tempahan Jubah - ${formData.matricNo}`;
                
                const paymentUrl = `https://toyyibpay.com/${TOYYIBPAY_CATEGORY_CODE}?` +
                                   `billName=${encodeURIComponent(billDescription)}` +
                                   `&billDescription=${encodeURIComponent(orderDetails.serviceText)}` +
                                   `&billPriceSetting=1` + 
                                   `&billAmount=${amountInCents}` +
                                   `&billTo=${encodeURIComponent(formData.fullName)}` +
                                   `&billEmail=${encodeURIComponent(formData.matricNo)}@unimas.my` + // Anggaran emel
                                   `&billPhone=${encodeURIComponent(formData.phoneNo)}` +
                                   `&billReturnUrl=${encodeURIComponent(redirectURL)}` +
                                   `&billCallbackUrl=${encodeURIComponent(redirectURL)}`; 
                                   
                window.location.href = paymentUrl;

            } else if (!formData || !orderDetails) {
                alert("Ralat data: Maklumat servis dan borang hilang. Sila kembali ke halaman sebelumnya.");
            } else {
                alert("Sila sahkan semua maklumat sebelum meneruskan.");
            }
        });
    }

    // ===========================================================
    // LOGIK UNTUK HALAMAN 5: PEMBAYARAN (Menerima status ToyyibPay)
    // ===========================================================
    if (document.querySelector('.payment-container')) {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status'); 
        const loadingSection = document.getElementById('loading-section');
        const successSection = document.getElementById('success-section');
        const failureSection = document.getElementById('failure-section'); 

        // Sembunyikan semua dahulu
        if (loadingSection) loadingSection.style.display = 'none';
        if (successSection) successSection.style.display = 'none';
        if (failureSection) failureSection.style.display = 'none';
        
        if (status === '1') {
            // Status 1 = Berjaya
            if (successSection) successSection.style.display = 'block';
            
            // Konfeti hanya jika berjaya
            if (typeof confetti === 'function') {
                const myCanvas = document.getElementById('confetti-canvas');
                const myConfetti = confetti.create(myCanvas, {
                    resize: true,
                    useWorker: true
                });
                myConfetti({
                    particleCount: 150,
                    spread: 90,
                    origin: { y: 0.6 }
                });
            }
            
            // Lakukan kemaskini status Firebase di sini jika berjaya
            // --- KOD BARU UNTUK SIMPAN KE FIRESTORE ---
            try {
                const orderDetails = getFromLocalStorage('orderDetails');
                const formData = getFromLocalStorage('formData');
                
                if (orderDetails && formData && typeof db !== 'undefined') {
                    const finalOrderData = {
                        ...formData,
                        ...orderDetails,
                        statusPembayaran: 'berjaya',
                        tarikhTempahan: new Date().toISOString() // Simpan tarikh & masa tempahan
                    };
                    
                    // Simpan ke collection 'tempahanBerjaya'
                    // Kita akan guna collection ini untuk semak kuota
                    db.collection("tempahanBerjaya").add(finalOrderData)
                        .then((docRef) => {
                            console.log("Tempahan berjaya disimpan ke Firestore dengan ID: ", docRef.id);
                        })
                        .catch((error) => {
                            console.error("Ralat menyimpan tempahan ke Firestore: ", error);
                            // Walaupun gagal simpan, jangan halang pengguna dapatkan resit
                        });
                } else if (typeof db === 'undefined') {
                    console.error("Firestore (db) tidak dijumpai. Tidak dapat simpan rekod tempahan.");
                } else {
                    console.warn("Tiada data 'orderDetails' atau 'formData' dalam localStorage untuk disimpan.");
                }
            } catch (e) {
                console.error("Ralat semasa cuba simpan ke Firestore: ", e);
            }
            // --- TAMAT KOD BARU ---
            
        } else if (status === '2' || status === '3') {
            // Status 2 = Gagal, Status 3 = Dibatalkan
            if (failureSection) failureSection.style.display = 'block';
        } else {
            // Jika tiada status dalam URL, paparkan loading simulasi
            if (loadingSection) loadingSection.style.display = 'block';
            
            // Simulasi proses pembayaran jika diakses terus
            setTimeout(() => {
                if (loadingSection) loadingSection.style.display = 'none';
                if (successSection) successSection.style.display = 'block'; // Tunjuk 'success' untuk tujuan demo
            }, 3000); 
        }

        // Logik untuk muat turun resit PDF
        document.getElementById('download-receipt').addEventListener('click', () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const orderDetails = getFromLocalStorage('orderDetails');
            const formData = getFromLocalStorage('formData');
            const today = new Date();
            const dateString = `${today.getDate()} ${today.toLocaleString('ms-MY', { month: 'long' })} ${today.getFullYear()}`;


            // Header Resit
            doc.setFontSize(18);
            doc.setTextColor('#0b132b');
            doc.text("RESIT PEMBAYARAN", 105, 20, null, null, "center");
            doc.setFontSize(12);
            doc.text("Servis Pengambilan & Penghantaran Jubah", 105, 28, null, null, "center");
            
            doc.setDrawColor('#ffd700');
            doc.line(20, 35, 190, 35); // Garisan pemisah

            // Info Transaksi
            doc.setTextColor('#333');
            doc.text("Tarikh Pembayaran:", 20, 45);
            doc.text(dateString, 80, 45);
            doc.text("No. Transaksi:", 20, 52);
            doc.text(`TYP-${Date.now().toString().slice(-6)}`, 80, 52);
            doc.text("Kaedah Bayaran:", 20, 59);
            doc.text("FPX (ToyyibPay)", 80, 59);

            doc.line(20, 66, 190, 66);

            // Butiran Pelanggan
            doc.setFontSize(14);
            doc.setTextColor('#0b132b');
            doc.text("Butiran Pelanggan", 20, 76);
            doc.setFontSize(12);
            doc.setTextColor('#333');
            doc.text("Nama Penuh:", 20, 85);
            doc.text(formData ? formData.fullName : 'N/A', 80, 85);
            doc.text("No. Matrik:", 20, 92);
            doc.text(formData ? formData.matricNo : 'N/A', 80, 92);
            doc.text("No. Telefon:", 20, 99);
            doc.text(formData ? formData.phoneNo : 'N/A', 80, 99);
            doc.text("Fakulti:", 20, 106);
            doc.text(formData ? formData.fakulti : 'N/A', 80, 106);


            doc.line(20, 113, 190, 113);
            
            // Servis Dipilih
            doc.setFontSize(14);
            doc.setTextColor('#0b132b');
            doc.text("Servis Dipilih", 20, 123);
            doc.setFontSize(12);
            doc.setTextColor('#333');
            doc.text(orderDetails ? `> ${orderDetails.serviceText}` : "Tiada servis dipilih", 20, 132);

            // Total
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor('#0b132b');
            doc.text("Jumlah Bayaran:", 20, 147);
            doc.text(orderDetails ? `RM${parseFloat(orderDetails.price).toFixed(2)}` : "RM0.00", 190, 147, null, null, "right");
            doc.text("Status Pembayaran:", 20, 154);
            doc.setTextColor('#28a745');
            doc.text("BERJAYA", 190, 154, null, null, "right");
            
            doc.setFont(undefined, 'normal');

            doc.line(20, 162, 190, 162);

            // Mesej Penutup
            doc.setFontSize(10);
            doc.setTextColor('#555');
            doc.text("Syabas dan tahniah kepada para graduan.", 105, 172, null, null, "center");
            doc.text("Terima kasih kerana menggunakan servis kami.", 105, 177, null, null, "center");
            doc.text("Semoga hari konvokesyen anda penuh makna 🎓✨", 105, 182, null, null, "center");

            // Footer Resit
            doc.setDrawColor('#ffd700');
            doc.line(20, 270, 190, 270);
            doc.setTextColor('#0b132b');
            doc.text("UNIMAS | Graduasi 2025", 105, 278, null, null, "center");

            doc.save(`resit-pembayaran-${formData.matricNo || 'N_A'}.pdf`);

            // Clear local storage after receipt is generated
            localStorage.removeItem('orderDetails');
localStorage.removeItem('formData');
localStorage.removeItem('fileNames');
        });
    }
});