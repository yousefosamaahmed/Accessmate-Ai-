from fastapi import APIRouter
from sqlalchemy import text

from app.database import engine
from app.core.response import success_response, error_response


router = APIRouter(
    prefix="/health",
    tags=["Health"]
)


@router.get("")
def health_check():
    try:
        with engine.connect() as connection:
            database_name = connection.execute(
                text("SELECT current_database();")
            ).scalar()

            tables = connection.execute(
                text("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    ORDER BY table_name;
                """)
            ).fetchall()

            table_names = [table[0] for table in tables]

        return success_response(
            message="Database connected successfully",
            data={
                "database": database_name,
                "tables_count": len(table_names),
                "tables": table_names
            }
        )

    except Exception as error:
        return error_response(
            message="Database connection failed",
            error_code="DATABASE_CONNECTION_ERROR",
            data=str(error)
        )