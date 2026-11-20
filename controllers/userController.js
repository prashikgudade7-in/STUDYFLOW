import db from "../config/database.js";
import { safeUser, userById } from "../utils/authUtils.js";

export function updateProfile(req, res) {
    const current = db.prepare(
        "SELECT * FROM users WHERE id=?"
    ).get(req.user.id);

    if (!current) {
        return res.status(404).json({
            error: "User not found."
        });
    }

    const fields = {
        name: String(req.body?.name ?? current.full_name).trim(),
        school: String(req.body?.school ?? current.school).trim(),
        timezone: String(req.body?.timezone ?? current.timezone).trim(),
        photo: String(req.body?.photo ?? current.photo).trim(),
        standard: String(req.body?.standard ?? current.standard),
        board: String(req.body?.board ?? current.board)
    };

    if (
        fields.name.length < 2 ||
        fields.photo.length > 500000 ||
        !["7", "8", "9", "10", "11", "12"].includes(fields.standard) ||
        ![
            "CBSE",
            "ICSE",
            "Maharashtra State Board",
            "Other State Board",
            "Other"
        ].includes(fields.board)
    ) {
        return res.status(400).json({
            error: "Check your name, class, board or profile photo size."
        });
    }

    db.prepare(`
        UPDATE users
        SET full_name=?, school=?, timezone=?, photo=?,
            standard=?, board=?
        WHERE id=?
    `).run(
        fields.name,
        fields.school,
        fields.timezone,
        fields.photo,
        fields.standard,
        fields.board,
        req.user.id
    );

    res.json({
        user: userById(req.user.id)
    });
}
