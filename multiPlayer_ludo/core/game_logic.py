from pygame import mixer

class GameLogic:
    def __init__(self, renderer, board, players, game_id):
        self.game_id = game_id
        self.board = board
        self.renderer = renderer
        self.players = players
        self.current_player_id = None
        self.dice_value = 0
        self.selected_piece = None
        self.possible_moves = []
        self.previous_game_state = None

    def handle_piece_selection(self, pos):
        current_player = self.get_current_player()
        if current_player:
            selected_piece = current_player.select_piece(pos, self.board)
            if selected_piece and self.is_valid_selection(selected_piece):
                self.selected_piece = selected_piece
                self.possible_moves = self.calculate_possible_moves(selected_piece)
                return self.possible_moves
            self.selected_piece = None
            self.possible_moves = []
        return []

    def calculate_possible_moves(self, piece):
        moves = []
        
        if piece.is_home and self.dice_value == 6:
            start_position = tuple(self.board.get_start_position(piece.color))
            if not self.is_blocked(start_position, piece.color):
                moves.append(start_position)
            else:
                print(f"Start position {start_position} is blocked")
        elif not piece.is_home and not piece.is_finished:
            current_position = tuple(piece.position)
            path = self.board.paths[piece.color]
            try:
                current_index = path.index(current_position)
            except ValueError:
                return moves

            new_index = current_index + self.dice_value
            if new_index < len(path)-1:
                new_position = tuple(path[new_index])
                
                if self.is_blocked(new_position, piece.color):
                    print(f"Position {new_position} is blocked")
                elif self.is_valid_move(new_position, piece.color):
                    moves.append(new_position)
                else:
                    print(f"Invalid move: {new_position}")
            elif new_index >= len(path)-1:
                moves.append('finished')
        return moves

    def is_valid_selection(self, piece):
        return (piece.is_home and self.dice_value == 6) or (not piece.is_home and not piece.is_finished)

    def handle_piece_movement(self, selected_piece):
        self.selected_piece = selected_piece
        current_player = self.get_current_player()
        if not current_player or not selected_piece:
            return False

        move_successful, captured = self.board.move_piece(selected_piece, self.dice_value, self.players, self.current_player_id)

        if move_successful:
            self.handle_captures(captured)
            current_player.deselect_all_pieces()
            self.selected_piece = None 

            self.dice_value = 0
        return move_successful

    def handle_captures(self, captured_pieces):
        for player, piece in captured_pieces:
            player.send_piece_home(piece)

    def next_turn(self):
        self.dice_value = 0

    def get_current_player(self):
        return next((p for p in self.players if p.player_id == self.current_player_id), None)

    def is_current_player(self, player_id):
        if self.current_player_id is None:
            return False
        return str(self.current_player_id) == str(player_id)
    
    def is_blocked(self, position, moving_color):
        pieces_on_position = self.get_pieces_on_position(position)
        if len(pieces_on_position) == 0:
            return False
        if len(pieces_on_position) >= 1:
            blocking_color = pieces_on_position[0].color
            if (blocking_color == moving_color):
                return False
            if all(p.color == blocking_color for p in pieces_on_position):
                if self.board.is_safe_space(position, blocking_color):
                    return True
        return False
    
    def is_valid_move(self, position, moving_color):
        position = tuple(position)
        pieces_on_position = self.get_pieces_on_position(position)

        # Rule 1: Empty space is always valid
        if len(pieces_on_position) == 0:
            return True

        # Rule 2 & 3: Can capture single opponent piece or stack with own color
        if len(pieces_on_position) == 1:
            return True  # Can either capture or stack

        # Rule 4: Cannot move to space occupied by two or more opponent pieces
        if len(pieces_on_position) >= 2:
            if all(p.color != moving_color for p in pieces_on_position):
                return False  # Cannot move past two or more enemy pieces
            return True  # Can move if at least one piece is of the same color

        return True
    
    def get_pieces_on_position(self, position):
        pieces = []
        check_position = tuple(position) if position is not None else (None, None)
        
        for player in self.players:
            for piece in player.pieces:
                piece_position = tuple(piece.position) if piece.position is not None else (None, None)

                if piece_position == check_position and not piece.is_home and not piece.is_finished:
                    pieces.append(piece)
        return pieces

    def can_current_player_move(self):
        current_player = self.get_current_player()
        if not current_player:
            return False
        
        return any(self.calculate_possible_moves(piece) for piece in current_player.pieces)

    def update_game_state(self, game_data):
        if game_data is None:
            return
        
        if 'currentPlayer' in game_data:
            self.current_player_id = game_data.get('currentPlayer', self.current_player_id)
        
        if 'diceValue' in game_data:
            self.dice_value = game_data.get('diceValue', self.dice_value)

        if 'pieces' in game_data:
            self.renderer.start_animating(self.previous_game_state, game_data, self.players)
            self.update_pieces(game_data['pieces'])

    def update_pieces(self, pieces_data):
        for player in self.players:
            if player.player_id in pieces_data:
                player.update_pieces(pieces_data[player.player_id])

    def is_player_turn(self, player):
        return self.current_player_id == player.player_id

    def get_board_state(self):
        return {
            'gameId': self.game_id,
            'players': ','.join(player.player_id for player in self.players),
            'currentPlayer': self.current_player_id,
            'diceValue': self.dice_value,
            'pieces': {player.player_id: player.get_pieces_state() for player in self.players},
        }