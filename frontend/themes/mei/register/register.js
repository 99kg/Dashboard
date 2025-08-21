document.getElementById("registerForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const adminPassword = document.getElementById("adminPassword").value;

    const errorMessage = document.getElementById("errorMessage");

    // 校验用户名长度
    if (username.length < 3 || username.length > 20) {
        errorMessage.textContent = "Username must be between 3 and 20 characters long.";
        errorMessage.style.display = "block";
        return;
    }

    // 校验密码长度
    if (password.length < 6 || password.length > 20) {
        errorMessage.textContent = "Password must be between 6 and 20 characters long.";
        errorMessage.style.display = "block";
        return;
    }

    if (password !== confirmPassword) {
        errorMessage.textContent = "User passwords do not match.";
        errorMessage.style.display = "block";
        return;
    }

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password, adminPassword }),
        });

        const data = await response.json();

        if (response.ok) {
            errorMessage.textContent = "User registered successfully!";
            errorMessage.style.display = "block";
            setTimeout(() => {
                window.location.href = "/login";
            }, 2000); // 延迟跳转以便用户看到消息
        } else {
            errorMessage.textContent = data.error || "Registration failed.";
            errorMessage.style.display = "block";
        }
    } catch (error) {
        errorMessage.textContent = "An error occurred. Please try again.";
        errorMessage.style.display = "block";
    }
});