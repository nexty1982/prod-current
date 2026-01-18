import unittest
import numpy as np

from om_image_enhance.pipeline import run_pipeline
from om_image_enhance.config import DEFAULT_CONFIG


class TestPipeline(unittest.TestCase):
    def test_run_pipeline(self):
        img = np.ones((100, 100, 3), dtype=np.uint8) * 255
        config = DEFAULT_CONFIG.copy()
        enhanced, steps = run_pipeline(img, config)
        self.assertEqual(enhanced.shape, img.shape)
        self.assertGreater(len(steps), 0)

    def test_binarize(self):
        img = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)
        config = DEFAULT_CONFIG.copy()
        config["high_legibility"] = True
        enhanced, steps = run_pipeline(img, config)
        self.assertIn("binarize", steps)

    def test_no_steps(self):
        img = np.ones((50, 50, 3), dtype=np.uint8) * 128
        # all bool flags -> False
        config = DEFAULT_CONFIG.copy()
        for k, v in list(config.items()):
            if isinstance(v, bool):
                config[k] = False
        enhanced, steps = run_pipeline(img, config)
        self.assertEqual(len(steps), 0)
        np.testing.assert_array_equal(enhanced, img)


if __name__ == "__main__":
    unittest.main()

