import sys
import argparse


def main():
    parser = argparse.ArgumentParser(description="SmileX-CAS admin account management")
    subparsers = parser.add_subparsers(dest="command")

    create_parser = subparsers.add_parser("create", help="Create an admin account")
    create_parser.add_argument("--username", "-u", required=True, help="Admin username")
    create_parser.add_argument("--email", "-e", required=True, help="Admin email")
    create_parser.add_argument("--password", "-p", required=True, help="Admin password")
    create_parser.add_argument("--full-name", "-n", default=None, help="Full name")

    reset_parser = subparsers.add_parser(
        "reset-password", help="Reset an admin account password"
    )
    reset_parser.add_argument("--username", "-u", required=True, help="Admin username")
    reset_parser.add_argument("--password", "-p", required=True, help="New password")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    from app.database import init_db, SessionLocal
    from app.models.user import User
    from app.auth import get_password_hash

    init_db()

    db = SessionLocal()
    try:
        if args.command == "create":
            existing = db.query(User).filter(User.username == args.username).first()
            if existing:
                print(f"Error: User '{args.username}' already exists.")
                sys.exit(1)
            admin = User(
                username=args.username,
                email=args.email,
                password_hash=get_password_hash(args.password),
                full_name=args.full_name,
                is_active=True,
                is_admin=True,
            )
            db.add(admin)
            db.commit()
            print(f"Admin account '{args.username}' created successfully.")

        elif args.command == "reset-password":
            user = db.query(User).filter(User.username == args.username).first()
            if not user:
                print(f"Error: User '{args.username}' not found.")
                sys.exit(1)
            user.password_hash = get_password_hash(args.password)
            db.commit()
            print(f"Password for '{args.username}' has been reset.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
