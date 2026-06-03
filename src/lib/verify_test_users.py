import os

import firebase_admin
from firebase_admin import credentials, auth

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

cred = credentials.Certificate(
    os.path.join(BASE_DIR, "firebase-admin.json")
)

firebase_admin.initialize_app(cred)

emails = [
    "agent.new@studycedo-test.com",
    "agent.free@studycedo-test.com",
    "agent.pro@studycedo-test.com",
    "agent.teacher@studycedo-test.com",
]

for email in emails:
    try:
        user = auth.get_user_by_email(email)

        auth.update_user(
            user.uid,
            email_verified=True
        )

        print(f"✅ Verified: {email}")

    except Exception as e:
        print(f"❌ Failed: {email}")
        print(e)