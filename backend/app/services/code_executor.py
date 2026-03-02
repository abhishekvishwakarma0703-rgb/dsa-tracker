"""
Code execution service for safe code testing
"""

import asyncio
import subprocess
import tempfile
import os
import json
import logging
from typing import Any, Dict
from app.core.config import settings

logger = logging.getLogger(__name__)

async def execute_code(
    code: str,
    input_data: Any,
    language: str = "javascript",
    timeout: int = 5
) -> Dict[str, Any]:
    """
    Execute code safely with timeout and return results
    
    Args:
        code: Source code to execute
        input_data: Input parameters for the function
        language: Programming language (javascript, python, cpp, java)
        timeout: Execution timeout in seconds
    
    Returns:
        Dictionary with execution results
    """
    
    if not settings.SANDBOX_ENABLED:
        return {"error": "Code execution is disabled"}
    
    if len(code) > settings.MAX_CODE_LENGTH:
        return {"error": f"Code exceeds maximum length of {settings.MAX_CODE_LENGTH} characters"}
    
    try:
        if language == "javascript":
            return await execute_javascript(code, input_data, timeout)
        elif language == "python":
            return await execute_python(code, input_data, timeout)
        elif language == "cpp":
            return await execute_cpp(code, input_data, timeout)
        elif language == "java":
            return await execute_java(code, input_data, timeout)
        else:
            return {"error": f"Unsupported language: {language}"}
    except asyncio.TimeoutError:
        return {"error": f"Execution timeout after {timeout} seconds"}
    except Exception as e:
        logger.error(f"Error executing code: {str(e)}")
        return {"error": str(e)}

async def execute_javascript(code: str, input_data: Any, timeout: int) -> Dict[str, Any]:
    """Execute JavaScript code"""
    try:
        # Create wrapper to call the function with input data
        wrapper = f"""
        {code}
        
        (async () => {{
            try {{
                const result = await (typeof solution !== 'undefined' ? solution({json.dumps(input_data)}) : main({json.dumps(input_data)}));
                console.log(JSON.stringify(result));
            }} catch (error) {{
                console.error('Error: ' + error.message);
            }}
        }})();
        """
        
        process = await asyncio.create_subprocess_exec(
            "node", "-e", wrapper,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )
            
            output_str = stdout.decode().strip()
            error_str = stderr.decode().strip()
            
            if error_str:
                return {"error": error_str}
            
            try:
                output = json.loads(output_str)
                return {"output": output}
            except json.JSONDecodeError:
                return {"output": output_str}
        except asyncio.TimeoutError:
            process.kill()
            raise
    except Exception as e:
        return {"error": str(e)}

async def execute_python(code: str, input_data: Any, timeout: int) -> Dict[str, Any]:
    """Execute Python code"""
    try:
        wrapper = f"""
{code}

import json
try:
    result = solution({json.dumps(input_data)}) if 'solution' in dir() else main({json.dumps(input_data)})
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({{"error": str(e)}}), file=__import__('sys').stderr)
"""
        
        process = await asyncio.create_subprocess_exec(
            "python", "-c", wrapper,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )
            
            output_str = stdout.decode().strip()
            error_str = stderr.decode().strip()
            
            if error_str:
                return {"error": error_str}
            
            try:
                output = json.loads(output_str)
                return {"output": output}
            except json.JSONDecodeError:
                return {"output": output_str}
        except asyncio.TimeoutError:
            process.kill()
            raise
    except Exception as e:
        return {"error": str(e)}

async def execute_cpp(code: str, input_data: Any, timeout: int) -> Dict[str, Any]:
    """Execute C++ code"""
    # CPP execution would require compilation - simplified version
    return {"error": "C++ execution requires compilation and is currently not supported in this version"}

async def execute_java(code: str, input_data: Any, timeout: int) -> Dict[str, Any]:
    """Execute Java code"""
    # Java execution would require compilation - simplified version
    return {"error": "Java execution requires compilation and is currently not supported in this version"}
