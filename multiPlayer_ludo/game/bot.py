import random
from game.player import Player

class Bot(Player):
    def __init__(self, color, start_positions, player_id):
        super().__init__(color, start_positions, player_id)
        self.is_bot = True

    def choose_move(self, game_logic):
        dice_value = game_logic.dice_value
        possible_moves = []

        for piece in self.pieces:
            moves = game_logic.calculate_possible_moves(piece)
            if moves:
                possible_moves.append((piece, moves))

        if not possible_moves:
            return None

        # Strategy priorities
        move_priorities = {
            'finish': [],
            'capture': [],
            'leave_home': [],
            'safe_move': [],
            'block': [],
            'regular_move': []
        }

        for piece, moves in possible_moves:
            for move in moves:
                if move == 'finished':
                    move_priorities['finish'].append((piece, move))
                elif piece.is_home and dice_value == 6:
                    move_priorities['leave_home'].append((piece, move))
                elif self.can_capture(game_logic, piece, move):
                    move_priorities['capture'].append((piece, move))
                elif game_logic.board.is_safe_space(move, self.color):
                    move_priorities['safe_move'].append((piece, move))
                elif self.can_block(game_logic, piece, move):
                    move_priorities['block'].append((piece, move))
                else:
                    move_priorities['regular_move'].append((piece, move))

        # Choose the highest priority move available
        for move_type in ['finish', 'capture', 'leave_home', 'safe_move', 'block', 'regular_move']:
            if move_priorities[move_type]:
                return random.choice(move_priorities[move_type])[0]  # Return the piece to move

        # This should never happen, but just in case
        return random.choice([move[0] for move in possible_moves])

    def can_capture(self, game_logic, piece, new_position):
        pieces_on_position = game_logic.get_pieces_on_position(new_position)
        return any(p.color != self.color for p in pieces_on_position) and not game_logic.board.is_safe_space(new_position, piece.color)

    def can_block(self, game_logic, piece, new_position):
        pieces_on_position = game_logic.get_pieces_on_position(new_position)
        return any(p.color == self.color for p in pieces_on_position) and game_logic.board.is_safe_space(new_position, piece.color)

    def make_move(self, game_logic):
        if not game_logic.is_player_turn(self):
            return False
        
        chosen_piece = self.choose_move(game_logic)
        if chosen_piece:
            return game_logic.handle_piece_movement(chosen_piece)
        return False

def create_bot(color, start_positions, player_id):
    return Bot(color, start_positions, player_id)