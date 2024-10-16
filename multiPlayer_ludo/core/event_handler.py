import pygame
import logging
import threading

class EventHandler:
    def __init__(self, game):
        self.game = game
        self.possible_moves = []
        self.selected_piece = None
        self.dice_roll_in_progress = False 

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            self.handle_mouse_click(event.pos)
        
        self.game.chat.handle_event(event)

    def handle_mouse_click(self, pos):
        try:
            if self.game.game_started:
                current_player_id = self.game.network_manager.user_data.get('playerId')
                
                if current_player_id is None:
                    return
                
                if self.game.game_logic.is_current_player(current_player_id):
                    if self.game.game_logic.dice_value == 0:
                        if not self.dice_roll_in_progress:
                            self.dice_roll_in_progress = True
                            self.game.network_manager.request_dice_roll()
                            
                            threading.Timer(5.0, self.reset_dice_roll_in_progress).start()
                        else:
                            logging.info("Awaiting dice roll")
                    else:
                        self.handle_piece_interaction(pos)
        except Exception as e:
            logging.exception("An error occurred in handle_mouse_click")

    def reset_dice_roll_in_progress(self):
        self.dice_roll_in_progress = False

    def handle_piece_interaction(self, pos):
        game_logic = self.game.game_logic
        
        # Check if a piece is being selected
        new_selection = game_logic.handle_piece_selection(pos)
        
        if new_selection:
            # A new piece was selected
            self.selected_piece = game_logic.selected_piece
            self.possible_moves = new_selection
            logging.info(f"Selected piece at {self.selected_piece.position}. Possible moves: {self.possible_moves}")
            
            # If the selected piece is at home and can move, move it immediately
            if self.selected_piece.is_home and game_logic.dice_value == 6:
                move_successful = game_logic.handle_piece_movement(self.selected_piece)
                if move_successful:
                    self.game.update_game_state()
                    logging.info(f"Moved piece from home to start position")
                    self.selected_piece = None
                    self.possible_moves = []
                else:
                    logging.info("Move from home was unsuccessful")
        elif self.selected_piece:
            # Attempt to move the selected piece
            if self.screen_to_board_position(pos) in self.possible_moves:
                move_successful = game_logic.handle_piece_movement(self.selected_piece)
                if move_successful:
                    self.game.update_game_state()
                    logging.info(f"Moved piece to {self.screen_to_board_position(pos)}")
                    self.selected_piece = None
                    self.possible_moves = []
                else:
                    logging.exception("Move was unsuccessful")
            elif self.screen_to_board_position(pos) in self.game.board.get_center_positions():
                move_successful = game_logic.handle_piece_movement(self.selected_piece)
                if move_successful:
                    self.game.update_game_state()
                    logging.info(f"Finished piece")
                    self.selected_piece = None
                    self.possible_moves = []
            else:
                self.possible_moves= []
                logging.info(f"Invalid move to {self.screen_to_board_position(pos)}")
        else:
            logging.info("No piece selected and no valid piece at click position")

        # Check if the current player can make any moves
        if not game_logic.can_current_player_move():
            game_logic.next_turn()
            self.game.update_game_state()
            self.selected_piece = None
            self.possible_moves = []
            logging.info("No possible moves, next turn")

    def get_possible_moves(self):
        return self.possible_moves
    
    def screen_to_board_position(self, screen_pos):
        board = self.game.board
        x, y = screen_pos

        board_x = (x - board.margin_x) // board.square_size
        board_y = (y - board.margin_y) // board.square_size

        if 0 <= board_x < 15 and 0 <= board_y < 15:
            return (board_y, board_x)
        else:
            return None