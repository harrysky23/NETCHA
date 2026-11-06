import math
import unittest
from collections import deque
from functools import lru_cache

from app import world


class SchoolTests(unittest.IsolatedAsyncioTestCase):
    def test_shared_human_mask_and_white_defaults(self):
        player = world.Player('one', 'token', '하나')
        self.assertEqual(len(world.PAINT_MASK), 256)
        for y in range(16):
            row = world.PAINT_MASK[y * 16:(y + 1) * 16]
            self.assertEqual(row, row[::-1])
        for index, inside in enumerate(world.PAINT_MASK):
            if inside:
                self.assertEqual(player.palette[player.colors[index]], '#ffffff')

    async def test_sampled_palette_is_exact_and_masked(self):
        player = world.Player('one', 'token', '하나')
        room = world.GameRoom('TEST1', player)
        await room.handle(player, {'type': 'start'})
        palette = player.palette + ['#a1b2c3']
        await room.handle(player, {'type': 'paint', 'palette': palette, 'colors': [8] * 256})
        self.assertEqual(player.palette[-1], '#a1b2c3')
        self.assertEqual(player.colors, [8 if inside else 0 for inside in world.PAINT_MASK])
        before = list(player.colors)
        await room.handle(player, {'type': 'paint', 'palette': palette, 'colors': [9] * 256})
        self.assertEqual(player.colors, before)
        await room.handle(player, {'type': 'paint', 'palette': ['invalid'] * 8, 'colors': [0] * 256})
        self.assertEqual(player.colors, before)

    def test_internal_wall_blocks_movement_and_shots(self):
        hunter = world.Player('hunter', 'token', '술래', x=620, y=320, role='hunter')
        hider = world.Player('hider', 'token2', '도망자', x=700, y=320)
        room = world.GameRoom('TEST2', hunter)
        room.players[hider.player_id] = hider
        room.phase = 'hunting'
        room._step_player(hunter, 30, 0)
        self.assertEqual(hunter.x, 620)
        room._shoot(hunter, {'x': 700, 'y': 320}, 100)
        self.assertTrue(hider.alive)

    async def test_viewport_limits_and_scoring_match_visible_area(self):
        hunter = world.Player('hunter', 'token', '술래', x=1024, y=784, role='hunter')
        hider = world.Player('hider', 'token2', '도망자', x=1024, y=960)
        room = world.GameRoom('TEST3', hunter)
        room.players[hider.player_id] = hider
        await room.handle(hunter, {'type': 'viewport', 'width': 500, 'height': 200})
        room._award_score(1)
        self.assertEqual(hider.score, 0)
        await room.handle(hunter, {'type': 'viewport', 'width': 10000, 'height': 10000})
        self.assertEqual((hunter.view_width, hunter.view_height), (800, 600))
        room._award_score(1)
        self.assertEqual(hider.score, 1)
        await room.handle(hunter, {'type': 'viewport', 'width': math.nan, 'height': 200})
        self.assertEqual(hunter.view_height, 600)

    def test_all_rooms_are_reachable_through_doorways(self):
        @lru_cache(maxsize=None)
        def walkable(x, y):
            return 32 < x < world.MAP_WIDTH - 32 and 32 < y < world.MAP_HEIGHT - 32 and not any(
                world._overlap({'x': x, 'y': y}, obstacle) for obstacle in world.OBSTACLES
            )

        targets = {(int(spawn['x']), int(spawn['y'])) for spawn in world.SPAWNS}
        self.assertTrue(all(walkable(*target) for target in targets))
        start = (int(world.SPAWNS[0]['x']), int(world.SPAWNS[0]['y']))
        visited = {start}
        queue = deque([start])
        while queue and not targets.issubset(visited):
            x, y = queue.popleft()
            for dx, dy in ((16, 0), (-16, 0), (0, 16), (0, -16)):
                neighbor = (x + dx, y + dy)
                if neighbor not in visited and walkable(*neighbor):
                    visited.add(neighbor)
                    queue.append(neighbor)
        self.assertTrue(targets.issubset(visited), f'고립된 생성 위치: {targets - visited}')


if __name__ == '__main__':
    unittest.main()
