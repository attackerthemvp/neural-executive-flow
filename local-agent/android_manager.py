import os
import re
import shutil
import subprocess
import tempfile
import base64
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

class AndroidManagerError(Exception):
    """Base exception for AndroidManager errors."""
    pass

class AndroidManager:
    def __init__(self, adb_path: str = "adb"):
        self.adb_path = adb_path
        self._verify_adb()

    def _verify_adb(self) -> None:
        """Verify that adb is installed and working."""
        if shutil.which(self.adb_path):
            return
        
        # If not in path, check common locations
        common_paths = [
            r"C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe",
            r"C:\Android\sdk\platform-tools\adb.exe",
            os.path.expanduser(r"~\AppData\Local\Android\Sdk\platform-tools\adb.exe"),
        ]
        for p in common_paths:
            if os.path.exists(p):
                self.adb_path = p
                return
        raise AndroidManagerError(
            "ADB executable not found. Please install Android Platform Tools and add 'adb' to PATH."
        )

    def _run_adb(self, args: List[str], serial: Optional[str] = None, timeout: int = 15) -> subprocess.CompletedProcess:
        """Run an ADB command and return the process result."""
        cmd = [self.adb_path]
        if serial:
            cmd.extend(["-s", serial])
        cmd.extend(args)
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                errors="replace"
            )
            # If stderr indicates device is not found or connection failed, raise exception
            if result.returncode != 0 and ("device not found" in result.stderr.lower() or "device offline" in result.stderr.lower()):
                raise AndroidManagerError(f"ADB Error: {result.stderr.strip()}")
            return result
        except subprocess.TimeoutExpired as e:
            raise AndroidManagerError(f"ADB command timed out: {' '.join(cmd)}") from e
        except AndroidManagerError:
            raise
        except Exception as e:
            raise AndroidManagerError(f"Failed to execute ADB command: {e}") from e

    def _verify_device(self, serial: Optional[str] = None) -> str:
        """Verify a device is connected and return its resolved serial."""
        devices = self.list_devices()
        if not devices:
            raise AndroidManagerError("No Android devices connected.")
        
        if serial:
            if not any(d["serial"] == serial for d in devices):
                raise AndroidManagerError(f"Android device with serial '{serial}' is not connected.")
            return serial
        else:
            return devices[0]["serial"]

    def list_devices(self) -> List[Dict[str, str]]:
        """List all connected devices and their status."""
        result = self._run_adb(["devices"])
        if result.returncode != 0:
            raise AndroidManagerError(f"Failed to list devices: {result.stderr}")
        
        devices = []
        lines = result.stdout.strip().splitlines()
        # First line is "List of devices attached"
        for line in lines[1:]:
            if not line.strip():
                continue
            parts = line.split()
            if len(parts) >= 2:
                devices.append({
                    "serial": parts[0],
                    "status": parts[1]
                })
        return devices

    def connect_device(self, host: str, port: int = 5555) -> str:
        """Establish connection to a device over TCP/IP."""
        target = f"{host}:{port}"
        result = self._run_adb(["connect", target])
        if result.returncode != 0:
            raise AndroidManagerError(f"Failed to connect: {result.stderr}")
        if "unable" in result.stdout.lower() or "failed" in result.stdout.lower():
            raise AndroidManagerError(f"Connection failed: {result.stdout.strip()}")
        return result.stdout.strip()

    def disconnect_device(self, host: Optional[str] = None, port: int = 5555) -> str:
        """Disconnect device(s) over TCP/IP."""
        target = f"{host}:{port}" if host else None
        args = ["disconnect"]
        if target:
            args.append(target)
        result = self._run_adb(args)
        if result.returncode != 0:
            raise AndroidManagerError(f"Failed to disconnect: {result.stderr}")
        return result.stdout.strip()

    def get_device_info(self, serial: Optional[str] = None) -> Dict[str, Any]:
        """Retrieve detailed information about the device."""
        serial = self._verify_device(serial)
        
        # Helper to get getprop values
        def get_prop(prop_name: str) -> str:
            res = self._run_adb(["shell", "getprop", prop_name], serial=serial)
            return res.stdout.strip() if res.returncode == 0 else "unknown"

        model = get_prop("ro.product.model")
        manufacturer = get_prop("ro.product.manufacturer")
        android_version = get_prop("ro.build.version.release")
        sdk_level = get_prop("ro.build.version.sdk")
        
        # Get screen size
        size_res = self._run_adb(["shell", "wm", "size"], serial=serial)
        resolution = "unknown"
        if size_res.returncode == 0:
            m = re.search(r"Physical size:\s*(\d+x\d+)", size_res.stdout)
            if m:
                resolution = m.group(1)
        
        # Get battery level
        battery_res = self._run_adb(["shell", "dumpsys", "battery"], serial=serial)
        battery_level = -1
        battery_status = "unknown"
        if battery_res.returncode == 0:
            level_match = re.search(r"level:\s*(\d+)", battery_res.stdout)
            if level_match:
                battery_level = int(level_match.group(1))
            
            status_map = {1: "unknown", 2: "charging", 3: "discharging", 4: "not charging", 5: "full"}
            status_match = re.search(r"status:\s*(\d+)", battery_res.stdout)
            if status_match:
                battery_status = status_map.get(int(status_match.group(1)), "unknown")

        return {
            "serial": serial,
            "model": model,
            "manufacturer": manufacturer,
            "android_version": android_version,
            "sdk_level": sdk_level,
            "resolution": resolution,
            "battery_level": battery_level,
            "battery_status": battery_status
        }

    def launch_app(self, package_name: str, serial: Optional[str] = None) -> Dict[str, Any]:
        """Launch an application by its package name."""
        serial = self._verify_device(serial)

        # Resolve launcher activity using package manager
        res = self._run_adb(["shell", "cmd", "package", "resolve-activity", "--brief", package_name], serial=serial)
        
        if res.returncode == 0 and "/" in res.stdout:
            # Parse the brief response, e.g. "com.android.settings/.Settings"
            activity = res.stdout.strip().splitlines()[-1]
            launch_res = self._run_adb(["shell", "am", "start", "-n", activity], serial=serial)
            if launch_res.returncode == 0:
                return {"success": True, "method": "resolve-activity", "activity": activity, "output": launch_res.stdout.strip()}

        # Fallback to monkey if resolve-activity fails
        monkey_res = self._run_adb([
            "shell", "monkey", "-p", package_name, 
            "-c", "android.intent.category.LAUNCHER", "1"
        ], serial=serial)
        
        if monkey_res.returncode == 0:
            return {"success": True, "method": "monkey", "output": monkey_res.stdout.strip()}
        
        raise AndroidManagerError(
            f"Failed to launch app '{package_name}'. Output: {monkey_res.stderr or monkey_res.stdout}"
        )

    def take_screenshot(self, serial: Optional[str] = None) -> str:
        """Capture screenshot from device and return as Base64 PNG string."""
        serial = self._verify_device(serial)

        # Create temporary file paths
        local_temp_fd, local_temp_path = tempfile.mkstemp(suffix=".png")
        os.close(local_temp_fd)
        
        device_temp_path = "/sdcard/nexus_temp_screencap.png"

        try:
            # Capture on device
            cap_res = self._run_adb(["shell", "screencap", "-p", device_temp_path], serial=serial)
            if cap_res.returncode != 0:
                # Try direct capture to stdout if SD card is not writable/accessible
                exec_res = subprocess.run(
                    [self.adb_path] + (["-s", serial] if serial else []) + ["exec-out", "screencap", "-p"],
                    capture_output=True,
                    timeout=15
                )
                if exec_res.returncode == 0 and len(exec_res.stdout) > 0:
                    with open(local_temp_path, "wb") as f:
                        f.write(exec_res.stdout)
                else:
                    raise AndroidManagerError(f"Screencap failed: {cap_res.stderr or exec_res.stderr}")
            else:
                # Pull file from device
                pull_res = self._run_adb(["pull", device_temp_path, local_temp_path], serial=serial)
                # Clean up device file
                self._run_adb(["shell", "rm", device_temp_path], serial=serial)
                if pull_res.returncode != 0:
                    raise AndroidManagerError(f"Failed to pull screenshot from device: {pull_res.stderr}")

            # Read and encode to base64
            with open(local_temp_path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
            
            return encoded_string
        finally:
            # Clean up local temp file
            if os.path.exists(local_temp_path):
                os.remove(local_temp_path)

    def tap(self, x: int, y: int, serial: Optional[str] = None) -> str:
        """Send a tap event at coordinate (x, y)."""
        serial = self._verify_device(serial)
        
        res = self._run_adb(["shell", "input", "tap", str(x), str(y)], serial=serial)
        if res.returncode != 0:
            raise AndroidManagerError(f"Tap failed: {res.stderr}")
        return f"Tapped at ({x}, {y})"

    def type_text(self, text: str, serial: Optional[str] = None) -> str:
        """Send a text input event. Spaces are replaced by %s."""
        serial = self._verify_device(serial)

        # Escape spaces for input command
        escaped_text = text.replace(" ", "%s")
        # Escape shell control characters
        escaped_text = re.sub(r'([$`"\\!])', r'\\\1', escaped_text)
        
        res = self._run_adb(["shell", "input", "text", escaped_text], serial=serial)
        if res.returncode != 0:
            raise AndroidManagerError(f"Text input failed: {res.stderr}")
        return f"Typed: {text}"

    def send_keyevent(self, keycode: int, serial: Optional[str] = None) -> str:
        """Send a hardware key event (e.g. 4 for BACK, 3 for HOME)."""
        serial = self._verify_device(serial)
        
        res = self._run_adb(["shell", "input", "keyevent", str(keycode)], serial=serial)
        if res.returncode != 0:
            raise AndroidManagerError(f"Keyevent failed: {res.stderr}")
        return f"Keyevent {keycode} sent"
