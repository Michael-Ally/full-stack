/* ===== API BASE URL ===== */
const API_URL = 'http://localhost:3000/api';

/* ===== WAIT FOR DOM TO LOAD ===== */
function setupEventListeners() {
    // LOGIN SEND OTP BUTTON
    let loginSendOtpBtn = document.getElementById("loginSendOtpBtn");
    if (loginSendOtpBtn) {
        console.log("✅ Attaching listener to loginSendOtpBtn");
        loginSendOtpBtn.addEventListener("click", function(e) {
            e.preventDefault();

            let phone = document.getElementById("loginPhone").value.trim();
            let role = document.querySelector('input[name="role"]:checked');
            let msg = document.getElementById("loginMsg");

            if (!role || phone === "") {
                msg.style.color = "red";
                msg.innerText = "Please select role and enter phone number!";
                return;
            }

            // Disable button and show loading
            loginSendOtpBtn.disabled = true;
            msg.style.color = "blue";
            msg.innerText = "Sending OTP...";

            // Call backend API
            fetch(`${API_URL}/login/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, role: role.value })
            })
            .then(res => res.json())
            .then(data => {
                loginSendOtpBtn.disabled = false;
                if (data.success) {
                    msg.style.color = "lightblue";
                    msg.innerText = data.message;

                    // Show OTP input section
                    let loginOtpSection = document.getElementById("loginOtpSection");
                    let loginSubmitBtn = document.getElementById("loginSubmitBtn");
                    loginOtpSection.style.display = "block";
                    loginSubmitBtn.style.display = "inline-block";
                    loginSendOtpBtn.style.display = "none";

                    // Store phone and role for verification
                    sessionStorage.setItem('loginPhone', phone);
                    sessionStorage.setItem('loginRole', role.value);
                } else {
                    msg.style.color = "red";
                    msg.innerText = data.message || "Error sending OTP";
                }
            })
            .catch(error => {
                loginSendOtpBtn.disabled = false;
                msg.style.color = "red";
                msg.innerText = "Error: " + error.message;
                console.error('Error:', error);
            });
        });
    }

    // LOGIN FORM SUBMIT
    let loginForm = document.getElementById("loginForm");
    if (loginForm) {
        console.log("✅ Attaching listener to loginForm");
        loginForm.addEventListener("submit", function(e) {
            e.preventDefault();

            let phone = sessionStorage.getItem('loginPhone');
            let role = sessionStorage.getItem('loginRole');
            let otp = document.getElementById("loginOtp").value.trim();
            let msg = document.getElementById("loginMsg");
            let loginSubmitBtn = document.getElementById("loginSubmitBtn");

            if (phone === "" || otp === "") {
                msg.style.color = "red";
                msg.innerText = "All fields are required!";
                return;
            }

            // Disable button and show loading
            loginSubmitBtn.disabled = true;
            msg.style.color = "blue";
            msg.innerText = "Verifying OTP...";

            // Call backend API
            fetch(`${API_URL}/login/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp, role })
            })
            .then(res => res.json())
            .then(data => {
                loginSubmitBtn.disabled = false;
                if (data.success) {
                    // Save session data from backend
                    localStorage.setItem("user", JSON.stringify(data.user));
                    localStorage.setItem("userRole", data.user.role);
                    localStorage.setItem("username", data.user.username);
                    localStorage.setItem("userPhone", data.user.phone);
                    localStorage.setItem("token", data.token);

                    msg.style.color = "lightgreen";
                    msg.innerText = data.message;

                    // Clean up session storage
                    sessionStorage.removeItem('loginPhone');
                    sessionStorage.removeItem('loginRole');

                    // Redirect based on role
                    setTimeout(() => {
                        if (data.user.role === "customer") {
                            window.location.href = "customer-order.html";
                        } else {
                            window.location.href = "main-page.html";
                        }
                    }, 800);
                } else {
                    msg.style.color = "red";
                    msg.innerText = data.message || "Error verifying OTP";
                }
            })
            .catch(error => {
                loginSubmitBtn.disabled = false;
                msg.style.color = "red";
                msg.innerText = "Error: " + error.message;
                console.error('Error:', error);
            });
        });
    }

    // SIGNUP SEND OTP BUTTON
    let sendOtpBtn = document.getElementById("sendOtpBtn");
    if (sendOtpBtn) {
        console.log("✅ Attaching listener to sendOtpBtn");
        sendOtpBtn.addEventListener("click", function(e) {
            e.preventDefault();

            let user = document.getElementById("newUser").value.trim();
            let phone = document.getElementById("newPhone").value.trim();
            let role = document.querySelector('input[name="role"]:checked');
            let msg = document.getElementById("signupMsg");

            if (!role || user === "" || phone === "") {
                msg.style.color = "red";
                msg.innerText = "Please fill all fields!";
                return;
            }

            // Disable button and show loading
            sendOtpBtn.disabled = true;
            msg.style.color = "blue";
            msg.innerText = "Sending OTP...";

            // Call backend API
            fetch(`${API_URL}/signup/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, phone, role: role.value })
            })
            .then(res => res.json())
            .then(data => {
                sendOtpBtn.disabled = false;
                if (data.success) {
                    msg.style.color = "lightblue";
                    msg.innerText = data.message;

                    // Show OTP input section
                    let otpSection = document.getElementById("otpSection");
                    let signupBtn = document.getElementById("signupBtn");
                    otpSection.style.display = "block";
                    signupBtn.style.display = "inline-block";
                    sendOtpBtn.style.display = "none";

                    // Store signup data for verification
                    sessionStorage.setItem('signupUser', user);
                    sessionStorage.setItem('signupPhone', phone);
                    sessionStorage.setItem('signupRole', role.value);
                } else {
                    msg.style.color = "red";
                    msg.innerText = data.message || "Error sending OTP";
                }
            })
            .catch(error => {
                sendOtpBtn.disabled = false;
                msg.style.color = "red";
                msg.innerText = "Error: " + error.message;
                console.error('Error:', error);
            });
        });
    }

    // SIGNUP FORM SUBMIT
    let signupForm = document.getElementById("signupForm");
    if (signupForm) {
        console.log("✅ Attaching listener to signupForm");
        signupForm.addEventListener("submit", function(e) {
            e.preventDefault();

            let phone = sessionStorage.getItem('signupPhone');
            let otp = document.getElementById("newOtp").value.trim();
            let msg = document.getElementById("signupMsg");
            let signupBtn = document.getElementById("signupBtn");

            if (phone === "" || otp === "") {
                msg.style.color = "red";
                msg.innerText = "All fields are required!";
                return;
            }

            // Disable button and show loading
            signupBtn.disabled = true;
            msg.style.color = "blue";
            msg.innerText = "Verifying OTP...";

            // Call backend API
            fetch(`${API_URL}/signup/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp })
            })
            .then(res => res.json())
            .then(data => {
                signupBtn.disabled = false;
                if (data.success) {
                    msg.style.color = "lightgreen";
                    msg.innerText = data.message;

                    // Clean up session storage
                    sessionStorage.removeItem('signupUser');
                    sessionStorage.removeItem('signupPhone');
                    sessionStorage.removeItem('signupRole');

                    // Reset form after 1.5 seconds
                    setTimeout(() => {
                        signupForm.reset();
                        document.getElementById("otpSection").style.display = "none";
                        document.getElementById("signupBtn").style.display = "none";
                        document.getElementById("sendOtpBtn").style.display = "inline-block";
                        msg.innerText = "Signup successful! You can now login.";
                        msg.style.color = "lightgreen";
                    }, 1500);
                } else {
                    msg.style.color = "red";
                    msg.innerText = data.message || "Error creating account";
                }
            })
            .catch(error => {
                signupBtn.disabled = false;
                msg.style.color = "red";
                msg.innerText = "Error: " + error.message;
                console.error('Error:', error);
            });
        });
    }
}

// Setup listeners when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupEventListeners);
} else {
    // DOM is already loaded
    setupEventListeners();
}

/* ================= ACCESS CONTROL ================= */
function checkAccess(allowedRoles) {
    let role = localStorage.getItem("userRole");

    if (!role) {
        alert("Please login first!");
        window.location.href = "login.html";
        return;
    }

    // Support multiple roles
    if (!allowedRoles.includes(role)) {
        alert("Access Denied!");
        window.location.href = "login.html";
    }
}

/* ================= SHOW USER INFO ================= */
function showUser() {
    let user = localStorage.getItem("username");
    let role = localStorage.getItem("userRole");

    let el = document.getElementById("userInfo");

    if (el) {
        el.innerText = "Logged in as: " + user + " (" + role + ")";
    }
}

/* ================= LOGOUT ================= */
function logout() {
    localStorage.removeItem("userRole");
    localStorage.removeItem("username");
    localStorage.removeItem("userPhone");
    localStorage.removeItem("token");
    window.location.href = "login.html";
}