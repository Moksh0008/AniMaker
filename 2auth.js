document.getElementById("login-form").addEventListener("submit", function (event) {
    event.preventDefault(); // Prevents form from reloading the page

    // Get input values (Optional: You can use these for authentication logic)
    let email = document.getElementById("login-email").value;
    let password = document.getElementById("login-password").value;

    // Here, you can add authentication logic if needed

    // Redirect to 1home.html after successful login
    window.location.href = "1home.html";
});
