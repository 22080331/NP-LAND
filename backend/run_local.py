"""Chạy backend NP Land trên máy local (cổng 5001)."""
import app

with app.app.app_context():
    app.db.create_all()
    app.seed()

app.app.run(host="0.0.0.0", port=5001)
