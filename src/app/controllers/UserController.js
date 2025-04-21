const User = require('../models/User');
const bcrypt = require('bcrypt');

class UserController {
    // [GET] /user/register
    registerForm(req, res) {
        res.render('user/register');
    }

    // [POST] /user/register
    async register(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.send(`
                    <script>
                        alert("Thiếu thông tin đăng ký!");
                        window.location.href = "/register";
                    </script>
                `);
            }

            // Kiểm tra username đã tồn tại chưa
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.send(`
                    <script>
                        alert("Tên đăng nhập đã tồn tại!");
                        window.location.href = "/register";
                    </script>
                `);
            }

            // Mã hóa mật khẩu trước khi lưu
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({ username, password });
            await newUser.save();

            return res.send(`
                <script>
                    alert("Đăng ký thành công!");
                    window.location.href = "/login";
                </script>
            `);
        } catch (error) {
            console.error("Lỗi server khi đăng ký:", error);
            return res.send(`
                <script>
                    alert("Lỗi server! Vui lòng thử lại.");
                    window.location.href = "/register";
                </script>
            `);
        }
    }

    // [GET] /user/login
    loginForm(req, res) {
        res.render('user/login');
    }

    // [POST] /user/login
    async login(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.send(`
                    <script>
                        alert("Thiếu thông tin đăng nhập!");
                        window.location.href = "/login";
                    </script>
                `);
            }

            // Danh sách username được phép đăng nhập
            const allowedUsers = ["user1", "user2", "user3", "user4", "user5"];

            // Kiểm tra username có trong danh sách không
            if (!allowedUsers.includes(username)) {
                return res.send(`
                    <script>
                        alert("Bạn không có quyền truy cập!");
                        window.location.href = "/login";
                    </script>
                `);
            }

            const user = await User.findOne({ username });
            if (!user) {
                return res.send(`
                    <script>
                        alert("Tên đăng nhập không tồn tại!");
                        window.location.href = "/login";
                    </script>
                `);
            }

            console.log("🔑 Mật khẩu nhập vào:", password);
            console.log("🔒 Mật khẩu trong database:", user.password);

            const isMatch = await bcrypt.compare(password, user.password);
            console.log("✅ Kết quả so sánh:", isMatch);

            if (!isMatch) {
                return res.send(`
                    <script>
                        alert("Mật khẩu không đúng!");
                        window.history.back();
                    </script>
                `);
            }

            // Lưu session đăng nhập
            req.session.user = user;
            console.log("🎉 Đăng nhập thành công! User:", user.username);

            return res.send(`
                <script>
                    alert("Đăng nhập thành công!");
                    window.location.href = "/site/trangchu";
                </script>
            `);
        } catch (error) {
            console.error("Lỗi server khi đăng nhập:", error);
            return res.send(`
                <script>
                    alert("Lỗi server! Vui lòng thử lại.");
                    window.location.href = "/login";
                </script>
            `);
        }
    }
    // [GET] /user/logout
    logout(req, res) {
        req.session.destroy(() => {
            res.redirect('/user/login');
        });
    }
}

module.exports = new UserController();
``
