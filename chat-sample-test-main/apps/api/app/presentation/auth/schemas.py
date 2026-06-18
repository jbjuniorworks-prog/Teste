from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    # str (not EmailStr) so as not to require the email-validator package. max_length=72
    # guards the bcrypt limit.
    email: str
    password: str = Field(min_length=1, max_length=72)
