import sys
import os
from android_manager import AndroidManager, AndroidManagerError

def run_tests():
    print("=" * 60)
    print("  Android Manager Test Suite")
    print("=" * 60)

    try:
        manager = AndroidManager()
        print("[SUCCESS] AndroidManager initialized successfully.")
    except AndroidManagerError as e:
        print(f"[FAIL] Initialization failed: {e}")
        sys.exit(1)

    # 1. Device detection
    print("\n--- 1. Testing Device Detection ---")
    try:
        devices = manager.list_devices()
        print(f"Connected devices: {devices}")
        if not devices:
            print("[FAIL] No connected devices found. Please connect an Android device or start an emulator.")
            sys.exit(1)
        else:
            print("[SUCCESS] Connected devices detected.")
    except Exception as e:
        print(f"[FAIL] Device detection failed: {e}")
        sys.exit(1)

    target_serial = devices[0]["serial"]
    print(f"Targeting device: {target_serial}")

    # 2. Device info retrieval
    print("\n--- 2. Testing Device Info Retrieval ---")
    try:
        info = manager.get_device_info(serial=target_serial)
        print("Device Information:")
        for k, v in info.items():
            print(f"  {k}: {v}")
        print("[SUCCESS] Device information retrieved.")
    except Exception as e:
        print(f"[FAIL] Device info retrieval failed: {e}")

    # 3. Screenshot capture
    print("\n--- 3. Testing Screenshot Capture ---")
    try:
        b64_data = manager.take_screenshot(serial=target_serial)
        print(f"Screenshot taken. Base64 length: {len(b64_data)}")
        if len(b64_data) > 0:
            print("[SUCCESS] Screenshot captured and verified.")
        else:
            print("[FAIL] Captured screenshot is empty.")
    except Exception as e:
        print(f"[FAIL] Screenshot capture failed: {e}")

    # 4. App launching
    print("\n--- 4. Testing App Launching (com.android.settings) ---")
    try:
        res = manager.launch_app("com.android.settings", serial=target_serial)
        print(f"Launch result: {res}")
        print("[SUCCESS] Settings application launched.")
    except Exception as e:
        print(f"[FAIL] App launch failed: {e}")

    # 5. Tap/Input functionality (Back key / Home key to not disturb phone state)
    print("\n--- 5. Testing Input / Keyevents ---")
    try:
        # Send Back key event (keycode 4) to close Settings or go back
        res_back = manager.send_keyevent(4, serial=target_serial)
        print(f"Keyevent BACK result: {res_back}")
        
        # Test type_text (we can type dummy text, but input text requires an active text field. 
        # We can just send the command and verify it doesn't crash)
        res_type = manager.type_text("NEXUS", serial=target_serial)
        print(f"Type text result: {res_type}")
        
        # Test tap at (100, 100)
        res_tap = manager.tap(100, 100, serial=target_serial)
        print(f"Tap result: {res_tap}")
        
        print("[SUCCESS] Input events sent successfully.")
    except Exception as e:
        print(f"[FAIL] Input event tests failed: {e}")

    # 6. Disconnection/Error handling
    print("\n--- 6. Testing Error Handling ---")
    try:
        # Request info for a non-existent device serial
        print("Querying bogus device serial 'BOGUS12345'...")
        manager.get_device_info(serial="BOGUS12345")
        print("[FAIL] Bogus query did not raise an exception.")
    except AndroidManagerError as e:
        print(f"[SUCCESS] Exception raised correctly for disconnected/invalid device: {e}")
    except Exception as e:
        print(f"[FAIL] Unexpected exception raised: {e}")

    print("\n" + "=" * 60)
    print("  Tests completed.")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
