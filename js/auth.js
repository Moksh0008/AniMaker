// Login
// Login
const loginForm = document.getElementById("login-form");

if (loginForm) {
    loginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            const data = await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email,
                    password
                })
            });

            // Save authentication data
            if (data.token) {
                setToken(data.token);
            }

            if (data.user) {
                setUser(data.user);
            }

            // Redirect after successful login
            window.location.href = "../index.html";

        } catch (error) {
            console.error("Login error:", error);

            const errorBox = document.getElementById("auth-error");

            if (errorBox) {
                errorBox.textContent = error.message;
                errorBox.style.display = "block";
            } else {
                alert(error.message);
            }
        }
    });
}

// Sign Up
const signupForm = document.getElementById("signup-form");

if (signupForm) {
    signupForm.addEventListener("submit", function(event) {
        event.preventDefault();

        let password = document.getElementById("signup-password").value;
        let confirmPassword = document.getElementById("signup-confirm-password").value;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        window.location.href = "../index.html";
    });
}
