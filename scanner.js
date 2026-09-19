// =============================
// scanner.js 3.1 — เพิ่มใน v1.12 (Medical Manager)
// นำมาจากตัวอย่างที่ใช้งานได้จริง แทบไม่ได้แก้ไข logic เลย
// (SESSION มาจาก scanner.html — window.opener.postMessage กลับไปที่ Client.html)
// =============================

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const loading = document.getElementById("loading");
const message = document.getElementById("message");

const flashBtn = document.getElementById("flashBtn");
const switchBtn = document.getElementById("switchBtn");
const closeBtn = document.getElementById("closeBtn");

const imageBtn = document.getElementById("imageBtn");
const qrFile = document.getElementById("qrFile");

let stream = null;
let detector = null;
let useNative = false;
let facingMode = "environment";
let scanning = false;
let stopped = false;
let rafId = null;
let torchEnabled = false;

// ----------------------------
// BarcodeDetector
// ----------------------------
async function initDetector() {

    if (!("BarcodeDetector" in window)) {
        console.log("BarcodeDetector : Not Supported");
        return;
    }

    try {

        const formats =
            await BarcodeDetector.getSupportedFormats();

        if (formats.includes("qr_code")) {

            detector = new BarcodeDetector({
                formats: ["qr_code"]
            });

            useNative = true;

            console.log("BarcodeDetector Ready");

        }

    }
    catch (e) {

        console.log(e);

    }

}

// ----------------------------
// เปิดกล้อง
// ----------------------------
async function startCamera() {

    stopCamera();

    loading.style.display = "flex";

    message.innerHTML = "กำลังเปิดกล้อง...";

    // แก้ v1.59 (รายงานผู้ใช้: สแกน QR ฉลากยาในแอปไม่ติด แต่สแกนผ่านกล้องมือถือ (แอปกล้องเดิมของเครื่อง)
    // ติดปกติ): เดิม getUserMedia() ขอกล้องแค่ facingMode อย่างเดียว ไม่ได้ระบุความละเอียดหรือโหมด
    // โฟกัสเลย เบราว์เซอร์หลายตัว/เครื่องหลายรุ่นจึงเปิดกล้องมาที่ความละเอียดต่ำ (เช่น 640x480) และ
    // ปล่อยโฟกัสไว้ที่โหมดปกติ (auto แบบยิงครั้งเดียว ไม่ใช่ continuous) — QR บนฉลากยาที่พิมพ์ออกมามีขนาด
    // เล็ก ต้องถือกล้องเข้าใกล้ชัด ๆ ถึงจะอ่านออก พอความละเอียดต่ำ+โฟกัสไม่ปรับต่อเนื่องตอนถือใกล้ ภาพที่ได้
    // จึงเบลอเกินกว่า jsQR/BarcodeDetector จะอ่านโมดูล QR ออก (ต่างจากแอปกล้องของเครื่องที่ใช้ความละเอียด
    // เต็มเซนเซอร์ + โฟกัสต่อเนื่อง/มาโครอยู่แล้วโดยปริยาย) แก้โดย (1) ขอความละเอียดสูงขึ้นแบบ ideal (เบราว์เซอร์
    // จะเลือกค่าที่ใกล้เคียงที่สุดที่กล้องรองรับให้เอง ไม่ทำให้เปิดกล้องพังถ้าเครื่องรองรับต่ำกว่า) และ (2) เปิด
    // continuous autofocus บน track หลังได้ stream มาแล้ว (ถ้ากล้อง/เบราว์เซอร์รองรับ — ไม่รองรับก็แค่ข้ามเงียบ ๆ
    // ไม่กระทบการทำงานอื่น)
    try {

        stream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    facingMode: {
                        ideal: facingMode
                    },

                    width: {
                        ideal: 1920
                    },

                    height: {
                        ideal: 1080
                    }

                },

                audio: false

            });

    }
    catch (e) {

        loading.style.display = "none";

        alert(
            "เปิดกล้องไม่สำเร็จ\n\n" +
            e.name +
            "\n" +
            e.message
        );

        return;

    }

    try {

        const track = stream.getVideoTracks()[0];

        const caps =
            track && track.getCapabilities
                ? track.getCapabilities()
                : {};

        if (caps.focusMode &&
            caps.focusMode.includes("continuous")) {

            await track.applyConstraints({
                advanced: [
                    { focusMode: "continuous" }
                ]
            });

        }

    }
    catch (e) {

        console.log(e);

    }

    video.srcObject = stream;

    await video.play();

    loading.style.display = "none";

    scanning = true;

    requestAnimationFrame(scanLoop);

}

// ----------------------------
// ปิดกล้อง
// ----------------------------
function stopCamera() {

    scanning = false;

    if (rafId)
        cancelAnimationFrame(rafId);

    if (stream) {

        stream
            .getTracks()
            .forEach(track => track.stop());

        stream = null;

    }

}

// ----------------------------
// Scan Loop
// ----------------------------
async function scanLoop() {

    if (!scanning || stopped)
        return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {

        try {

            // ---------- BarcodeDetector ----------
            if (useNative && detector) {

                const codes =
                    await detector.detect(video);

                if (codes.length > 0 &&
                    codes[0].rawValue) {

                    finish(codes[0].rawValue);
                    return;

                }

            }

            // ---------- jsQR Fallback ----------
            else {

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                ctx.drawImage(
                    video,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                const img =
                    ctx.getImageData(
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                const qr =
                    jsQR(
                        img.data,
                        img.width,
                        img.height
                    );




                if (qr && qr.data) {

                    finish(qr.data);
                    return;

                }

            }

        }
        catch (err) {

            console.log(err);

        }

    }

    rafId =
        requestAnimationFrame(scanLoop);

}

// ----------------------------
// Scan Success
// ----------------------------
function finish(text) {

    if (stopped)
        return;

    stopped = true;
    scanning = false;

    console.log("QR =", text);

    // สั่น 80ms
    if (navigator.vibrate)
        navigator.vibrate(80);

    stopCamera();

    sendResult(text);

}

// ----------------------------
// ปิดหน้าจอ
// ----------------------------
closeBtn.onclick = function () {

    stopped = true;

    stopCamera();

    window.close();

};


// ----------------------------
// ส่งผลกลับ Apps Script
// ----------------------------
function sendResult(text) {

    if (window.opener && !window.opener.closed) {

        window.opener.postMessage({
            type: "QR_RESULT",
            session: SESSION,
            text: text
        }, "*");

    }

    setTimeout(() => {
        window.close();
    }, 150);

}


// ----------------------------
// Scan QR from Image
// ----------------------------

// แก้ v1.61 (รายงานผู้ใช้: เลือกไฟล์รูปได้ปกติ แต่ไม่เกิดอะไรขึ้นเลย ไม่มีทั้งผลสแกนและข้อความ error ใด ๆ):
// เดิมโค้ดส่วนนี้มี 2 จุดที่ทำให้ "เงียบ" แบบนี้ได้จริง —
// 1) ไม่มี img.onerror เลย ถ้ารูปที่เลือกเปิด/ถอดรหัสไม่ได้ (ไฟล์เสีย หรือเป็นฟอร์แมตที่เบราว์เซอร์นั้นไม่รองรับ
//    เช่น รูป .heic ที่กล้อง iPhone บันทึกเป็นค่าเริ่มต้น ซึ่งบางเบราว์เซอร์/บาง WebView ถอดรหัสในแท็ก <img>
//    ไม่ได้) จะไม่มี event ไหนยิงเลยแม้แต่ event เดียว โค้ดเดิมเลยไม่มีทางรู้/แจ้งผู้ใช้ได้
// 2) canvas.width/height หรือ ctx.getImageData() อาจ throw ได้จริงถ้ารูปมีความละเอียดสูงเกินขีดจำกัด canvas
//    ของเบราว์เซอร์/เครื่องนั้น (พบได้กับรูปถ่ายจากมือถือรุ่นใหม่ที่ความละเอียดสูงมาก) แต่โค้ดเดิมไม่มี try/catch
//    คลุมไว้ ทำให้ exception หลุดขึ้น console เฉย ๆ ไม่มีอะไรแสดงให้ผู้ใช้เห็นบนหน้าจอเลย
// 3) qrFile ไม่เคยเคลียร์ค่าหลังเลือกไฟล์ ถ้าผู้ใช้เปิดตัวเลือกไฟล์ใหม่แล้วเลือก "ไฟล์เดิม" ซ้ำอีกครั้ง (เช่น
//    ลองใหม่หลังครั้งแรกไม่เจอ QR) เบราว์เซอร์จะไม่ยิง event "change" ให้เลยเพราะค่า input ไม่ได้เปลี่ยน —
//    ดูเหมือนกดเลือกไฟล์แล้ว "ไม่มีอะไรเกิดขึ้น" เหมือนกัน
// แก้ทั้ง 3 จุด: เคลียร์ qrFile.value ก่อนเปิดตัวเลือกไฟล์ทุกครั้ง, เพิ่ม img.onerror + try/catch รอบการ
// ประมวลผลรูป พร้อมข้อความแจ้งผู้ใช้ชัดเจนทุกเคส (ไม่ปล่อยให้เงียบอีกต่อไป) และขึ้นข้อความ "กำลังอ่าน..."
// ทันทีที่เลือกไฟล์ เผื่อรูปใหญ่ใช้เวลาถอดรหัสสักครู่ ผู้ใช้จะได้รู้ว่าระบบกำลังทำงานอยู่ ไม่ใช่ค้าง
imageBtn.onclick = function(){

    qrFile.value = "";

    qrFile.click();

};


qrFile.onchange = function(e){

    const file = e.target.files[0];

    if(!file)
        return;

    message.innerHTML = "กำลังอ่าน QR จากรูป...";

    const img = new Image();


    img.onload = function(){

        try {

            canvas.width = img.width;
            canvas.height = img.height;


            ctx.drawImage(
                img,
                0,
                0,
                canvas.width,
                canvas.height
            );


            const imageData =
                ctx.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );


            const qr =
                jsQR(
                    imageData.data,
                    imageData.width,
                    imageData.height
                );

            if(qr && qr.data){

                finish(qr.data);

            }
            else{

                message.innerHTML =
                "ไม่พบ QR Code ในรูป ลองเลือกรูปที่เห็น QR ชัด ๆ เต็ม ๆ ดูนะคะ";

            }

        }
        catch(err){

            console.log(err);

            message.innerHTML =
            "อ่านรูปนี้ไม่สำเร็จ (ไฟล์อาจใหญ่/ผิดปกติเกินไป) ลองเลือกรูปอื่นดูนะคะ";

        }
        finally{

            URL.revokeObjectURL(img.src);

        }

    };


    img.onerror = function(){

        URL.revokeObjectURL(img.src);

        message.innerHTML =
        "เปิดไฟล์รูปนี้ไม่ได้ (ไฟล์อาจเสีย หรือเป็นไฟล์ประเภทที่เบราว์เซอร์นี้ไม่รองรับ เช่น .heic บางเครื่อง) ลองเลือกไฟล์ JPG/PNG อื่นดูนะคะ";

    };


    img.src =
    URL.createObjectURL(file);

};



// ----------------------------
// สลับกล้อง
// ----------------------------
switchBtn.onclick = async function () {

    facingMode =
        facingMode === "environment"
            ? "user"
            : "environment";

    stopped = false;

    await startCamera();

};

// ----------------------------
// Torch
// ----------------------------
flashBtn.onclick = async function () {

    if (!stream)
        return;

    const track = stream.getVideoTracks()[0];

    if (!track)
        return;

    const cap = track.getCapabilities();

    if (!cap.torch) {

        alert("เครื่องนี้ไม่รองรับไฟฉาย");

        return;

    }

    torchEnabled = !torchEnabled;

    try {

        await track.applyConstraints({

            advanced: [
                {
                    torch: torchEnabled
                }
            ]

        });

        flashBtn.style.opacity =
            torchEnabled ? "1" : ".5";

    }
    catch (e) {

        console.log(e);

    }

};

// ----------------------------
// โหลดเสร็จ
// ----------------------------
window.onload = async function () {

    await initDetector();

    await startCamera();

};

// ----------------------------
// ออกจากหน้า
// ----------------------------
window.onbeforeunload = function () {

    stopCamera();

};

// ----------------------------
// Visibility
// ----------------------------
document.addEventListener(
    "visibilitychange",
    function () {

        if (document.hidden) {

            stopCamera();

        }

    }
);
