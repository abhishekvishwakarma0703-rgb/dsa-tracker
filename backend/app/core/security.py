import bcrypt

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt directly.
    """
    if not password:
        return ""
    
    # Bcrypt needs bytes, not strings
    password_bytes = password.encode('utf-8')
    
    # Generate a salt and hash the password
    # 12 rounds is the current industry standard for balance between security and speed
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    # Return as a string so it can be stored in the database easily
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a hashed password.
    """
    if not plain_password or not hashed_password:
        return False
        
    try:
        # Convert both to bytes for comparison
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        
        # bcrypt.checkpw automatically handles the salt stored within the hash
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        # If the hash is malformed or empty, return False
        return False