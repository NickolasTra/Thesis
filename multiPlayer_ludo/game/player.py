from game.piece import Piece

class Player:
    def __init__(self, color, start_positions, player_id, is_host=False):
        self.color = color
        self.player_id = player_id
        self.pieces = [Piece(color, pos) for pos in start_positions]
        self.has_won = False
        self.is_host = is_host

    def setup_pieces(self, pieces_data):
        for i, data in enumerate(pieces_data):
            self.pieces[i].position = data['position']
            self.pieces[i].is_home = data['is_home']
            self.pieces[i].is_finished = data['is_finished']
            self.pieces[i].stacked_pieces = data.get('stacked_pieces', 0)

    def get_pieces_state(self):
        return [{
            'position': piece.position,
            'is_home': piece.is_home,
            'is_finished': piece.is_finished,
            'stacked_pieces': piece.stacked_pieces
        } for piece in self.pieces]

    def select_piece(self, mouse_pos, board):
        for piece in self.pieces:
            if not piece.is_finished:
                piece_pos = piece.position if not piece.is_home else board.get_base_position(self.color, self.pieces.index(piece))
                if board.is_click_on_piece(mouse_pos, piece_pos):
                    if piece.is_selected:
                        piece.is_selected = False
                        return None
                    else:
                        self.deselect_all_pieces()
                        piece.is_selected = True
                        return piece
        return None
    
    def update_pieces(self, pieces_data):
        for i, data in enumerate(pieces_data):
            self.pieces[i].position = data['position']
            self.pieces[i].is_home = data['is_home']
            self.pieces[i].is_finished = data['is_finished']
            self.pieces[i].stacked_pieces = data.get('stacked_pieces', 0)

    def deselect_all_pieces(self):
        for piece in self.pieces:
            piece.is_selected = False

    def send_piece_home(self, piece):
        piece.send_home()

    def draw(self, screen, board):
        for i, piece in enumerate(self.pieces):
            if piece.is_home:
                base_pos = board.get_base_position(self.color, i)
                board.draw_piece(screen, piece, base_pos)
            elif not piece.is_finished:
                board.draw_piece(screen, piece, piece.position)

    def to_dict(self):
        return {
            'color': self.color,
            'pieces': [{
                'position': piece.position,
                'is_home': piece.is_home,
                'is_finished': piece.is_finished,
                'stacked_pieces': piece.stacked_pieces
            } for piece in self.pieces],
            'player_id': self.player_id
        }

    def __str__(self):
        return f"Player(id={self.player_id}, color={self.color}, pieces={len(self.pieces)})"

    def get_player_name_by_color(self):
        if self.color == (0, 0, 255):
            return "Blue"
        elif self.color == (255, 255, 0):
            return "Yellow"
        elif self.color == (255, 0, 0):
            return "Red"
        elif self.color == (0, 255, 0):
            return "Green"
        return "Unknown"