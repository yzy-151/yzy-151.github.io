import re
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class SiteParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.images = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if "id" in values:
            self.ids.add(values["id"])
        if tag == "img":
            self.images.append(values)


class PortfolioContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.parser = SiteParser()
        cls.parser.feed(cls.html)

    def test_required_sections_exist(self):
        self.assertTrue({"projects", "capabilities", "archive", "contact"}.issubset(self.parser.ids))

    def test_private_identity_and_resume_are_absent(self):
        forbidden = ["袁振洋", "哈尔滨工业大学", "resume.pdf", "简历下载", "sk-lf-"]
        for value in forbidden:
            self.assertNotIn(value, self.html)

    def test_featured_projects_and_metrics_are_present(self):
        required = [
            "PaperStorm Agent", "Nonlinear NN Agent", "0.5441",
            "0.7001", "0.8003", "-23.0778 dB",
        ]
        for value in required:
            self.assertIn(value, self.html)

    def test_public_repository_archive_is_complete(self):
        repositories = [
            "paperstorm-agent", "nonlinear-nn-agent", "HITSZ-Helper",
            "LED-Curve-Fitting-MATLAB", "HITSZ-Resume-Template", "2023.7.15DSSS",
            "2019D", "1-11", "UITest", "Jan.6UITest", "hello-world", "12-28",
            "12-18-", "Activity", "C-language-2020", "test11",
            "yzy-151", "yzy-151.github.io",
        ]
        for repository in repositories:
            self.assertRegex(self.html, rf"github\.com/yzy-151/{re.escape(repository)}(?:[\"#?])")

    def test_local_assets_exist_and_images_are_accessible(self):
        self.assertTrue((ROOT / "assets" / "styles.css").is_file())
        self.assertTrue((ROOT / "assets" / "app.js").is_file())
        self.assertGreaterEqual(len(self.parser.images), 4)
        for image in self.parser.images:
            self.assertTrue(image.get("alt", "").strip())
            source = image.get("src", "")
            self.assertTrue(source.startswith("assets/"))
            self.assertTrue((ROOT / source).is_file(), source)
            self.assertIn("width", image)
            self.assertIn("height", image)

    def test_page_has_no_local_machine_paths(self):
        self.assertNotRegex(self.html, r"[A-Za-z]:\\")
        self.assertNotIn("file://", self.html)


if __name__ == "__main__":
    unittest.main()
