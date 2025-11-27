from playwright.sync_api import sync_playwright

def verify_auth_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to auth page...")
        page.goto("http://localhost:8081/auth")

        # Wait for the Auth component to render (it might take a moment)
        page.wait_for_selector("button", timeout=5000)

        print("Taking screenshot...")
        page.screenshot(path="verification/auth_page_ui.png")

        # Check if email input exists
        if page.get_by_placeholder("Your email address").count() > 0 or page.get_by_role("textbox", name="Email").count() > 0:
            print("Email input found.")
        else:
            print("Email input NOT found.")

        browser.close()

if __name__ == "__main__":
    verify_auth_ui()
