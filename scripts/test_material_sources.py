import unittest

from sync_sheet import build_material_sources


class MaterialSourcesTest(unittest.TestCase):
    def test_source_is_drop_location_and_retains_target_linkage(self):
        sources = build_material_sources([{
            "dungeon_id": "source_dungeon", "item_name": "Test Stone",
            "item_type": "upgrade_material_asc",
            "upgrade_item_1_id": "different_dungeon_ring",
        }])
        self.assertEqual(sources[0]["dungeonId"], "source_dungeon")
        self.assertEqual(sources[0]["difficulty"], "V")
        self.assertEqual(sources[0]["upgradeItemIds"], ["different_dungeon_ring"])

    def test_alias_copy_materials_and_blank_rows(self):
        sources = build_material_sources([
            {"dungeon_id": "dng_132", "item_name": "Banner of Inspiraton"},
            {"dungeon_id": "dng_129", "item_name": "Vigor Mutant Ent Badge", "item_type": "badge_6"},
            {"dungeon_id": "dng_1", "item_name": ""},
        ])
        self.assertEqual(len(sources), 2)
        self.assertEqual(sources[0]["name"], "Banner of Inspiration")
        self.assertEqual(sources[0]["aliases"], ["Banner of Inspiraton"])
        self.assertIsNone(sources[1]["difficulty"])


if __name__ == "__main__":
    unittest.main()
