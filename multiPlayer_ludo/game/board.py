import pygame
import colorsys
from typing import Tuple, Dict, List, Set

class Board:
    def __init__(self, window_size: Tuple[int, int], background_image_path: str):
        self.window_width, self.window_height = window_size
        self.square_size = min(self.window_width, self.window_height) // 15
        self.margin_x = (self.window_width - (15 * self.square_size)) // 2
        self.margin_y = (self.window_height - (15 * self.square_size)) // 2

        self.background = pygame.image.load(background_image_path)
        self.background = pygame.transform.scale(self.background, window_size)

        self.colors = {
            0: None, 1: (255, 255, 255), 2: (0, 0, 255), 3: (255, 255, 0),
            4: (255, 0, 0), 5: (0, 255, 0)
        }
        self.border_color = (0, 0, 0)
        self.arrow_color = (0, 0, 0)
        self.arrow_size = self.square_size // 4
        self.highlight_color = (255, 165, 0)  # Orange highlight color

        self.center_gradient = self._create_center_gradient()
        self.safe_spaces_by_color: Dict[Tuple[int, int, int], Set[Tuple[int, int]]] = {
            (0, 0, 255): {(6, 1)},    # Blue
            (255, 255, 0): {(1, 8)},  # Yellow
            (255, 0, 0): {(13, 6)},   # Red
            (0, 255, 0): {(8, 13)}    # Green
        }
        self.paths = self._create_paths()
        self.start_positions = self._create_start_positions()
        self.base_positions = self._create_base_positions()
        self.finish_positions = self._create_finish_positions()

        self.center_positions = [(6,6), (6,7), (6,8), (7,6), (7,7), (7,8), (8,6), (8,7), (8,8)]

    def _create_center_gradient(self) -> Dict[Tuple[int, int], Tuple[int, int, int]]:
        return {(i, j): tuple(int(c * 255) for c in colorsys.hsv_to_rgb((i * 3 + j) / 9, 1, 1))
                for i in range(3) for j in range(3)}

    def _create_paths(self) -> Dict[Tuple[int, int, int], List[Tuple[int, int]]]:
        paths = {
            (0, 0, 255): [  # Blue path
                (6, 1), (6, 2), (6, 3), (6, 4), (6, 5),
                (5, 6), (4, 6), (3, 6), (2, 6), (1, 6), (0, 6),
                (0, 7), (0, 8),
                (1, 8), (2, 8), (3, 8), (4, 8), (5, 8),
                (6, 9), (6, 10), (6, 11), (6, 12), (6, 13), (6, 14),
                (7, 14), (8, 14),
                (8, 13), (8, 12), (8, 11), (8, 10), (8, 9),
                (9, 8), (10, 8), (11, 8), (12, 8), (13, 8), (14, 8),
                (14, 7), (14, 6),
                (13, 6), (12, 6), (11, 6), (10, 6), (9, 6),
                (8, 5), (8, 4), (8, 3), (8, 2), (8, 1),
                (8, 0), (7, 0),
                (7, 1), (7, 2), (7, 3), (7, 4), (7, 5), (7, 6)
            ],
            (255, 255, 0): [  # Yellow path
                (1, 8), (2, 8), (3, 8), (4, 8), (5, 8),
                (6, 9), (6, 10), (6, 11), (6, 12), (6, 13), (6, 14),
                (7, 14), (8, 14),
                (8, 13), (8, 12), (8, 11), (8, 10), (8, 9),
                (9, 8), (10, 8), (11, 8), (12, 8), (13, 8), (14, 8),
                (14, 7), (14, 6),
                (13, 6), (12, 6), (11, 6), (10, 6), (9, 6),
                (8, 5), (8, 4), (8, 3), (8, 2), (8, 1), (8, 0),
                (7, 0), (6, 0),
                (6, 1), (6, 2), (6, 3), (6, 4), (6, 5),
                (5, 6), (4, 6), (3, 6), (2, 6), (1, 6), (0, 6),
                (0, 7), (1, 7), (2, 7), (3, 7), (4, 7), (5, 7), (6, 7)
            ],
            (255, 0, 0): [  # Red path
                (13, 6), (12, 6), (11, 6), (10, 6), (9, 6),
                (8, 5), (8, 4), (8, 3), (8, 2), (8, 1), (8, 0),
                (7, 0), (6, 0),
                (6, 1), (6, 2), (6, 3), (6, 4), (6, 5),
                (5, 6), (4, 6), (3, 6), (2, 6), (1, 6), (0, 6),
                (0, 7), (0, 8),
                (1, 8), (2, 8), (3, 8), (4, 8), (5, 8),
                (6, 9), (6, 10), (6, 11), (6, 12), (6, 13), (6, 14),
                (7, 14), (8, 14),
                (8, 13), (8, 12), (8, 11), (8, 10), (8, 9),
                (9, 8), (10, 8), (11, 8), (12, 8), (13, 8), (14, 8),
                (14, 7), (13, 7), (12, 7), (11, 7), (10, 7), (9, 7), (8, 7)
            ],
            (0, 255, 0): [  # Green path
                (8, 13), (8, 12), (8, 11), (8, 10), (8, 9),
                (9, 8), (10, 8), (11, 8), (12, 8), (13, 8), (14, 8),
                (14, 7), (14, 6),
                (13, 6), (12, 6), (11, 6), (10, 6), (9, 6),
                (8, 5), (8, 4), (8, 3), (8, 2), (8, 1), (8, 0),
                (7, 0), (6, 0),
                (6, 1), (6, 2), (6, 3), (6, 4), (6, 5),
                (5, 6), (4, 6), (3, 6), (2, 6), (1, 6), (0, 6),
                (0, 7), (0, 8),
                (1, 8), (2, 8), (3, 8), (4, 8), (5, 8),
                (6, 9), (6, 10), (6, 11), (6, 12), (6, 13), (6, 14), 
                (7, 14), (7, 13), (7, 12), (7, 11), (7, 10), (7, 9), (7, 8)
            ]
        }
        return paths

    def _create_start_positions(self) -> Dict[Tuple[int, int, int], Tuple[int, int]]:
        return {
            (0, 0, 255): (6, 1),    # Blue
            (255, 255, 0): (1, 8),  # Yellow
            (255, 0, 0): (13, 6),   # Red
            (0, 255, 0): (8, 13)    # Green
        }

    def _create_finish_positions(self) -> Dict[Tuple[int, int, int], List[Tuple[int, int]]]:
        return {
            (0, 0, 255): [(7, 1), (7, 2), (7, 3), (7, 4), (7, 5)],    # Blue
            (255, 255, 0): [(1, 7), (2, 7), (3, 7), (4, 7), (5, 7)],  # Yellow
            (255, 0, 0): [(13, 7), (12, 7), (11, 7), (10, 7), (9, 7)],# Red
            (0, 255, 0): [(7, 13), (7, 12), (7, 11), (7, 10), (7, 9)] # Green
        }
    
    def get_finish_position(self, color: Tuple[int, int, int]):
        color_to_position = {
            (0, 0, 255): (7, 6),    # Blue
            (255, 255, 0): (6, 7),  # Yellow
            (255, 0, 0): (8, 7),    # Red
            (0, 255, 0): (7, 8)     # Green
        }
        return color_to_position.get(color, [])

    def _create_base_positions(self) -> Dict[Tuple[int, int, int], List[Tuple[int, int]]]:
        return {
            (0, 0, 255): [(1, 1), (1, 3), (3, 1), (3, 3)],          # Blue
            (255, 255, 0): [(1, 11), (1, 13), (3, 11), (3, 13)],    # Yellow
            (255, 0, 0): [(11, 1), (11, 3), (13, 1), (13, 3)],      # Red
            (0, 255, 0): [(11, 11), (11, 13), (13, 11), (13, 13)]   # Green
        }

    def draw(self, screen: pygame.Surface) -> None:
        screen.blit(self.background, (0, 0))
        self._draw_board(screen)
        self._draw_arrows(screen)

    def _draw_board(self, screen: pygame.Surface) -> None:
        for y, row in enumerate(self.create_board_layout()):
            for x, color_code in enumerate(row):
                rect = (self.margin_x + x * self.square_size,
                        self.margin_y + y * self.square_size,
                        self.square_size, self.square_size)

                if color_code == 6:
                    center_x, center_y = x - 6, y - 6
                    color = self.center_gradient.get((center_y, center_x), (255, 255, 255))
                    pygame.draw.rect(screen, color, rect)
                elif color_code != 0:
                    color = self.colors.get(color_code, (255, 255, 255))
                    pygame.draw.rect(screen, color, rect)

                if color_code != 0:
                    pygame.draw.rect(screen, self.border_color, rect, 1)

    def _draw_arrows(self, screen: pygame.Surface) -> None:
        arrows = [
            ((8, 1), "down"),
            ((13, 8), "left"),
            ((6, 13), "up"),
            ((1, 6), "right")
        ]
        for pos, direction in arrows:
            self.draw_arrow(screen, *pos, direction)

    def draw_arrow(self, screen: pygame.Surface, x: int, y: int, direction: str) -> None:
        center_x = self.margin_x + (x + 0.5) * self.square_size
        center_y = self.margin_y + (y + 0.5) * self.square_size

        points = {
            "right": [(center_x - self.arrow_size // 2, center_y - self.arrow_size // 4),
                      (center_x + self.arrow_size // 2, center_y),
                      (center_x - self.arrow_size // 2, center_y + self.arrow_size // 4)],
            "left": [(center_x + self.arrow_size // 2, center_y - self.arrow_size // 4),
                     (center_x - self.arrow_size // 2, center_y),
                     (center_x + self.arrow_size // 2, center_y + self.arrow_size // 4)],
            "down": [(center_x - self.arrow_size // 4, center_y - self.arrow_size // 2),
                     (center_x, center_y + self.arrow_size // 2),
                     (center_x + self.arrow_size // 4, center_y - self.arrow_size // 2)],
            "up": [(center_x - self.arrow_size // 4, center_y + self.arrow_size // 2),
                   (center_x, center_y - self.arrow_size // 2),
                   (center_x + self.arrow_size // 4, center_y + self.arrow_size // 2)]
        }

        pygame.draw.polygon(screen, self.arrow_color, points[direction])

    def draw_capture_marker(self, screen: pygame.Surface, position: Tuple[int, int]) -> None:
        x, y = self.get_pixel_position(position)
        marker_size = self.square_size // 2
        line_width = 5
        color = (255, 0, 0)  # Red color for the X

        # Draw the X
        pygame.draw.line(screen, color, (x - marker_size, y - marker_size), 
                         (x + marker_size, y + marker_size), line_width)
        pygame.draw.line(screen, color, (x - marker_size, y + marker_size), 
                         (x + marker_size, y - marker_size), line_width)

    def draw_piece(self, screen, piece, position, use_exact_position=True):
        if position is None:
            return  # Don't draw pieces with no position

        if use_exact_position:
            x, y = self.get_pixel_position(position)
        else:
            x, y = position

        radius = self.square_size // 3

        # Draw the main circle
        pygame.draw.circle(screen, piece.color, (x, y), radius)
        
        # Draw a border
        border_color = (0, 0, 0)  # Black border
        pygame.draw.circle(screen, border_color, (x, y), radius, 2)

        # If the piece is selected, draw a highlight
        if piece.is_selected:
            pygame.draw.circle(screen, self.highlight_color, (x, y), radius + 4, 4)

        # If the piece is stacked, draw a number indicating the stack size
        if piece.stacked_pieces > 0:
            font = pygame.font.Font(None, 24)
            text = font.render(str(piece.stacked_pieces + 1), True, (0, 0, 0))
            text_rect = text.get_rect(center=(x, y))
            screen.blit(text, text_rect)

    def get_start_position(self, color: Tuple[int, int, int]) -> Tuple[int, int]:
        return self.start_positions[color]

    def get_position_after_move(self, piece, steps):
        color = piece.color
        path = self.paths[color]
        current_position = tuple(piece.position) if piece.position else None

        if current_position is None or current_position in self.base_positions[color]:
            return self.start_positions[color]

        if current_position not in path:
            raise ValueError(f"Current position {current_position} is not in the path for color {color}")

        current_index = path.index(current_position)
        new_index = current_index + steps

        if new_index < len(path)-1:
            return path[new_index]
        
        if new_index >= len(path)-1:
            return 'finished'
        
        return None

    def get_pixel_position(self, board_position: Tuple[int, int]) -> Tuple[int, int]:
        x = self.margin_x + (board_position[1] + 0.5) * self.square_size
        y = self.margin_y + (board_position[0] + 0.5) * self.square_size
        return int(x), int(y)

    def is_click_on_piece(self, click_pos: Tuple[int, int], piece_pos: Tuple[int, int]) -> bool:
        if piece_pos is None:
            return False
        piece_pixel_pos = self.get_pixel_position(piece_pos)
        distance = ((click_pos[0] - piece_pixel_pos[0]) ** 2 + (click_pos[1] - piece_pixel_pos[1]) ** 2) ** 0.5
        return distance <= self.square_size // 2

    def get_base_position(self, color: Tuple[int, int, int], index: int) -> Tuple[int, int]:
        color_positions = self.base_positions[color]
        return color_positions[min(index, len(color_positions) - 1)]

    def is_safe_space(self, position: Tuple[int, int], color_rgb: Tuple[int, int, int]) -> bool:
        if color_rgb not in self.safe_spaces_by_color:
            raise ValueError(f"Unknown color: {color_rgb}")
        return position in self.safe_spaces_by_color[color_rgb]

    def draw_finish_tick(self, screen: pygame.Surface, color: Tuple[int, int, int]) -> None:
        finish_positions = {
            (0, 0, 255): (7, 5),  # Blue
            (255, 255, 0): (5, 7),  # Yellow
            (255, 0, 0): (9, 7),  # Red
            (0, 255, 0): (7, 9)  # Green
        }
        position = finish_positions[color]
        x, y = self.get_pixel_position(position)

        pygame.draw.circle(screen, (255, 255, 255), (x, y), self.square_size // 3)

        tick_color = (0, 0, 0)  # Black color for the tick
        tick_width = 2
        start_pos = (x - self.square_size // 6, y)
        mid_pos = (x - self.square_size // 12, y + self.square_size // 6)
        end_pos = (x + self.square_size // 4, y - self.square_size // 6)

        pygame.draw.line(screen, tick_color, start_pos, mid_pos, tick_width)
        pygame.draw.line(screen, tick_color, mid_pos, end_pos, tick_width)

    def create_board_layout(self) -> List[List[int]]:
        return [
            [2, 2, 2, 2, 2, 0, 1, 1, 1, 0, 3, 3, 3, 3, 3],
            [2, 1, 2, 1, 2, 0, 1, 3, 3, 0, 3, 1, 3, 1, 3],
            [2, 2, 0, 2, 2, 0, 1, 3, 1, 0, 3, 3, 0, 3, 3],
            [2, 1, 2, 1, 2, 0, 1, 3, 1, 0, 3, 1, 3, 1, 3],
            [2, 2, 2, 2, 2, 0, 1, 3, 1, 0, 3, 3, 3, 3, 3],
            [0, 0, 0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0, 0],
            [1, 2, 1, 1, 1, 1, 6, 6, 6, 1, 1, 1, 1, 1, 1],
            [1, 2, 2, 2, 2, 2, 6, 6, 6, 5, 5, 5, 5, 5, 1],
            [1, 1, 1, 1, 1, 1, 6, 6, 6, 1, 1, 1, 1, 5, 1],
            [0, 0, 0, 0, 0, 0, 1, 4, 1, 0, 0, 0, 0, 0, 0],
            [4, 4, 4, 4, 4, 0, 1, 4, 1, 0, 5, 5, 5, 5, 5],
            [4, 1, 4, 1, 4, 0, 1, 4, 1, 0, 5, 1, 5, 1, 5],
            [4, 4, 0, 4, 4, 0, 1, 4, 1, 0, 5, 5, 0, 5, 5],
            [4, 1, 4, 1, 4, 0, 4, 4, 1, 0, 5, 1, 5, 1, 5],
            [4, 4, 4, 4, 4, 0, 1, 1, 1, 0, 5, 5, 5, 5, 5]
        ]

    def get_square_rect(self, possible_move):
        if isinstance(possible_move, list):
            possible_move = possible_move[0]
        x, y = self.get_pixel_position(possible_move)
        return pygame.Rect(x - self.square_size // 2, y - self.square_size // 2, self.square_size, self.square_size)

    def draw_base(self, screen: pygame.Surface, color: Tuple[int, int, int], positions: List[Tuple[int, int]]) -> None:
        for pos in positions:
            x, y = self.get_pixel_position(pos)
            pygame.draw.rect(screen, (255, 255, 255), (x - self.square_size // 2, y - self.square_size // 2, self.square_size, self.square_size))
            pygame.draw.rect(screen, color, (x - self.square_size // 2, y - self.square_size // 2, self.square_size, self.square_size), 2)

    def move_piece(self, piece, steps, players, current_player_id):
        if piece.is_home:
            if steps == 6:
                start_position = self.get_start_position(piece.color)
                piece.position = start_position
                piece.is_home = False

                # Check for stacking at the start position
                current_player = next((player for player in players if player.player_id == current_player_id))
                piece = self.stack_pieces(piece, current_player)
                
                captured = self.check_capture(piece, players)
                return True, captured
            else:
                return False, []
        else:
            new_position = self.get_position_after_move(piece, steps)
            if new_position == 'finished':
                piece.finish()
                self.unstack_piece(piece, players)
                return True, []

            if new_position != piece.position:
                # Unstack the piece before moving
                self.unstack_piece(piece, players)

                piece.move(new_position)
                captured = self.check_capture(piece, players)

                current_player = next((player for player in players if player.player_id == current_player_id))
                piece = self.stack_pieces(piece, current_player)

                return True, captured

            return False, []

    def check_capture(self, piece, players):
        piece_position = tuple(piece.position) if piece.position is not None else None

        captured_pieces = []
        for player in players:
            if player.color == piece.color:
                continue  # Skip the same color player

            for other_piece in player.pieces:
                other_piece_position = tuple(other_piece.position) if other_piece.position is not None else None
                if other_piece_position is None:
                    continue  # Skip if other piece position is None

                if not other_piece.is_home and not other_piece.is_finished and other_piece_position == piece_position:

                    if self.is_safe_space(piece_position, other_piece.color):
                        print(f"Safe space at {piece_position}. No capture.")
                        return []
                    captured_pieces.append((player, other_piece))
                    print(f"Capture detected: {piece} captures {other_piece} at {piece_position}")

        return captured_pieces

    def stack_pieces(self, piece, player):
        piece_position = tuple(piece.position) if piece.position is not None else None
        if piece_position is None:
            return piece

        total_stack = 1
        pieces_to_stack = [piece]

        for other_piece in player.pieces:
            other_piece_position = tuple(other_piece.position) if other_piece.position is not None else None
            if other_piece_position is None:
                continue

            if (not other_piece.is_home and not other_piece.is_finished and 
                other_piece != piece and other_piece_position == piece_position):

                total_stack += 1
                pieces_to_stack.append(other_piece)

        for p in pieces_to_stack:
            p.stacked_pieces = total_stack - 1

        return piece
    
    def unstack_piece(self, piece, players):
        piece_position = tuple(piece.position) if piece.position is not None else None
        if piece_position is None:
            return

        for player in players:
            for other_piece in player.pieces:
                other_piece_position = tuple(other_piece.position) if other_piece.position is not None else None
                if other_piece_position is None:
                    continue

                if other_piece_position == piece_position and other_piece != piece:
                    other_piece.stacked_pieces= other_piece.stacked_pieces-1

        piece.stacked_pieces = 0
        
    def get_stacked_position(self, piece):
        x, y = self.get_pixel_position(piece.position)
        return x - self.square_size // 4, y - self.square_size // 4
    
    def get_center_positions(self):
        return self.center_positions
    
    def get_path_between(self, start_pos, end_pos, color):
        path = self.paths[color]

        start = tuple(start_pos) if start_pos is not None else None
        end = tuple(end_pos) if end_pos is not None else None

        if start is None or end is None:
            return []

        start_index = path.index(start)
        end_index = path.index(end)
        return path[start_index:end_index + 1]