class ComputerVisionService:
    def describe_image(self, image_path: str) -> str:
        raise NotImplementedError(
            "Computer vision image description is not implemented yet."
        )

    def analyze_screenshot(self, screenshot_path: str) -> dict:
        raise NotImplementedError(
            "Screenshot visual analysis is not implemented yet."
        )