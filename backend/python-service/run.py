import uvicorn
from app.config import settings
import os
# v2 - force rebuild

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=os.getenv("PYTHON_RELOAD", "false").lower() == "true",
    )
