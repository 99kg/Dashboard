document.addEventListener('DOMContentLoaded', async function () {
    const usernameDisplay = document.getElementById('username');
    const errorMessage = document.getElementById('errorMessage');
    const userTableBody = document.querySelector('#userTable tbody');
    let currentUsername = '';

    // 获取当前登录的用户名
    try {
        const response = await fetch('/api/check-session', {
            method: 'GET',
            credentials: 'include',
        });

        const data = await response.json();

        if (response.ok && data.authenticated) {
            currentUsername = data.username; // 动态获取当前用户名
            usernameDisplay.textContent = currentUsername;
        } else {
            usernameDisplay.textContent = 'Unknown User';
        }
    } catch (error) {
        console.error('Error fetching session:', error);
        usernameDisplay.textContent = 'Unknown User';
    }

    // 加载用户列表
    async function fetchUsers() {
        try {
            const response = await fetch('/api/admin/users', {
                method: 'GET',
                credentials: 'include',
            });

            const data = await response.json();

            if (response.ok && data.users) {
                populateUserTable(data.users);
                errorMessage.style.display = 'none'; // 隐藏错误信息
            } else {
                errorMessage.textContent = data.error || 'Failed to fetch users.';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            errorMessage.textContent = 'An error occurred while fetching users.';
            errorMessage.style.display = 'block';
        }
    }

    // 填充用户表格
    function populateUserTable(users) {
        userTableBody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.role}</td>
                <td>${user.lastLogin}</td>
                <td>
                    <button class="action-btn edit" ${user.username === currentUsername ? 'disabled style="background-color: #ccc; cursor: not-allowed;"' : ''} data-id="${user.id}">Edit</button>
                    <button class="action-btn delete" ${user.username === currentUsername ? 'disabled style="background-color: #ccc; cursor: not-allowed;"' : ''} data-id="${user.id}">Delete</button>
                </td>
            `;
            userTableBody.appendChild(row);
        });

        // 添加事件监听
        document.querySelectorAll('.action-btn.edit').forEach(btn => {
            btn.addEventListener('click', handleEditUser);
        });

        document.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', handleDeleteUser);
        });
    }

    // 编辑用户
    async function handleEditUser(event) {
        const userId = event.target.dataset.id;

        // 创建角色选择对话框
        const roleDialog = document.createElement('div');
        roleDialog.className = 'role-dialog';
        roleDialog.innerHTML = `
            <div class="dialog-content">
                <h3>Select new role</h3>
                <select id="roleSelect">
                    <option value="admin">admin</option>
                    <option value="user">user</option>
                </select>
                <div class="dialog-actions">
                    <button id="confirmRoleBtn">Confirm</button>
                    <button id="cancelRoleBtn">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(roleDialog);

        // 添加事件监听
        document.getElementById('confirmRoleBtn').addEventListener('click', async () => {
            const newRole = document.getElementById('roleSelect').value;

            try {
                const response = await fetch(`/api/admin/users/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ role: newRole }),
                });

                const data = await response.json();
                if (response.ok) {
                    alert('User role updated successfully.');
                    fetchUsers();
                } else {
                    alert(data.error || 'Failed to update user role.');
                }
            } catch (error) {
                alert('An error occurred while updating user role.');
            }

            document.body.removeChild(roleDialog); // 移除对话框
        });

        document.getElementById('cancelRoleBtn').addEventListener('click', () => {
            document.body.removeChild(roleDialog); // 移除对话框
        });
    }

    // 删除用户
    async function handleDeleteUser(event) {
        const userId = event.target.dataset.id;
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });

            const data = await response.json();
            if (response.ok) {
                alert('User deleted successfully.');
                fetchUsers();
            } else {
                alert(data.error || 'Failed to delete user.');
            }
        } catch (error) {
            alert('An error occurred while deleting user.');
        }
    }

    // 加载用户列表
    fetchUsers();

    // 登出功能
    document.getElementById('logoutBtn').addEventListener('click', function () {
        fetch('/logout', {
            method: 'GET',
            credentials: 'include',
        })
            .then(() => {
                window.location.href = '/login';
            })
            .catch(error => console.error('Logout error:', error));
    });
});