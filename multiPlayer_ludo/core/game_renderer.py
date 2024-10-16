import os
import sys
import pygame
import math
from game.piece import Piece
from pygame import mixer

def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(__file__)
    return os.path.join(base_path, relative_path)

class GameRenderer:
    def __init__(self, screen, font):
        self.screen = screen
        self.board = None
        self.font = font
        self.animation_queue = []
        self.current_animation = None
        self.animation_speed = 0.01
        self.is_animating = False
        mixer.init()
        self.move_sound = mixer.Sound(resource_path('assets/effects/move.mp3'))
        self.capture_sound = mixer.Sound(resource_path('assets/effects/capture.mp3'))
        self.trail_surface = None
        self.captured_piece = None
        self.capture_timer = 0
        self.capture_duration = 1000

    def render_game_board(self, board, players, selected_piece, possible_move, exclude_index=None, player_id=None):
        self.screen.fill((255, 255, 255))
        self.board = board
        if self.board:
            self.board.draw(self.screen)
            
            if selected_piece and possible_move and possible_move != ['finished']:
                self.highlight_possible_move(possible_move)
            
            for player in players:
                for index, piece in enumerate(player.pieces):
                    if exclude_index == index and player.player_id == player_id:
                        continue
                    
                    if piece.is_home:
                        base_pos = self.board.get_base_position(player.color, player.pieces.index(piece))
                        self.board.draw_piece(self.screen, piece, base_pos)
                    elif not piece.is_finished:
                        self.board.draw_piece(self.screen, piece, piece.position)         

    def start_animating(self, previous_game_state, new_game_state, players):
        self.move_animations = []
        self.capture_animations = []
        self.captured_pieces = []

        for player in players:
            if player.player_id in new_game_state['pieces']:
                if player.player_id not in previous_game_state['pieces']:
                    continue
                previous_pieces_data = previous_game_state['pieces'][player.player_id]
                new_pieces_data = new_game_state['pieces'][player.player_id]
                
                for i, (current_piece_data, new_piece_data) in enumerate(zip(previous_pieces_data, new_pieces_data)):
                    if new_piece_data['position'] != current_piece_data['position']:
                        current_piece_data['color'] = player.color
                        start_pos = current_piece_data['position']
                        end_pos = new_piece_data['position']
                        
                        is_capture = (start_pos is not None and end_pos is None and new_piece_data['is_home'])
                        
                        animation_data = (current_piece_data, new_piece_data, i, player.player_id, player.color, start_pos, end_pos)
                        
                        if is_capture:
                            self.capture_animations.append(animation_data)
                            self.captured_piece= current_piece_data
                        else:
                            self.move_animations.append(animation_data)

        self.process_next_animation(players)

    def process_next_animation(self, players):
        if self.move_animations:              
            animation_data = self.move_animations.pop(0)
            self.start_animation(*animation_data, players)
        elif self.capture_animations:
            # Play capture sound once before processing all captures
            self.capture_sound.play()
            # Process all capture animations at once
            for animation_data in self.capture_animations:
                self.process_capture_animation(*animation_data)
            self.capture_animations.clear()
            self.captured_piece = None
            self.is_animating = False
            # Render the final state after captures
            self.render_game_board(self.board, players, None, [])
            pygame.display.flip()
        else:
            self.is_animating = False

    def start_animation(self, current_piece_data, new_piece_data, index, player_id, color, start_pos, end_pos, players):
        if start_pos is None and current_piece_data['is_home']:
            self.move_sound.play()
            self.process_next_animation(players)
            return
        elif end_pos is None and new_piece_data['is_finished']:
            end_pos = self.board.get_finish_position(color)
        
        self.is_animating = True

        path = self.board.get_path_between(start_pos, end_pos, color)
        if path and len(path) > 1:
            print(f"Starting animation for {current_piece_data} from {start_pos} to {end_pos}")
            print(f"Path: {path}")
            current_piece_data['index'] = index
            current_piece_data['player_id'] = player_id
            self.current_animation = (current_piece_data, path)
            
            self.animate(players)
        else:
            print(f"Warning: Invalid path for {current_piece_data} from {start_pos} to {end_pos}")
            print(f"Path: {path}")
            self.process_next_animation(players)

    def process_capture_animation(self, current_piece_data, new_piece_data, index, player_id, color, start_pos, end_pos):
        print(f"Capturing piece at {start_pos}")
        self.captured_pieces.append(current_piece_data)

    def animate(self, players):
        if self.current_animation:
            piece, path = self.get_current_animated_piece()
            self.trail_surface = pygame.Surface(self.screen.get_size(), pygame.SRCALPHA)
            

            if path and len(path) > 1:
                for i in range(1, len(path)):
                    start_pos = path[i - 1]
                    end_pos = path[i]
                    start_pixel = self.board.get_pixel_position(start_pos)
                    end_pixel = self.board.get_pixel_position(end_pos)

                    self.move_sound.play()

                    total_distance = math.sqrt((end_pixel[0] - start_pixel[0])**2 + (end_pixel[1] - start_pixel[1])**2)
                    num_steps = min(int(total_distance / 2), 20)
                    
                    for step in range(num_steps + 1):
                        t = step / num_steps
                        x = int(start_pixel[0] + t * (end_pixel[0] - start_pixel[0]))
                        y = int(start_pixel[1] + t * (end_pixel[1] - start_pixel[1]))
                        
                        if step > 0:
                            prev_x = int(start_pixel[0] + (step-1)/num_steps * (end_pixel[0] - start_pixel[0]))
                            prev_y = int(start_pixel[1] + (step-1)/num_steps * (end_pixel[1] - start_pixel[1]))
                            alpha = int(255 * (1 - t))
                            pygame.draw.line(self.trail_surface, (*piece.color, alpha), (prev_x, prev_y), (x, y), 2)
                        
                        self.render_game_board(self.board, players, None, [], piece.index, piece.player_id)
                        self.screen.blit(self.trail_surface, (0, 0))
                        self.board.draw_piece(self.screen, piece, (x, y), False)

                        if isinstance(self.captured_piece, dict):
                            captured_piece = Piece(self.captured_piece.get('color'), self.captured_piece.get('start_position'))
                            captured_piece.position = self.captured_piece.get('position')
                            captured_piece.is_home = self.captured_piece.get('is_home', False)
                            captured_piece.is_finished = self.captured_piece.get('is_finished', False)
                            captured_piece.is_selected = self.captured_piece.get('is_selected', False)
                            captured_piece.stacked_pieces = self.captured_piece.get('stacked_pieces', 0)

                            self.board.draw_capture_marker(self.screen, captured_piece.position)
                            self.board.draw_piece(self.screen, captured_piece, captured_piece.position)
                        
                        pygame.display.update(pygame.Rect(0, 0, 800, 800))
                        pygame.time.wait(int(self.animation_speed * 1000))

                    self.trail_surface.fill((0, 0, 0, 0))

                self.render_game_board(self.board, players, None, [], piece.index, piece.player_id)
                
                self.board.draw_piece(self.screen, piece, end_pos)

                pygame.display.update(pygame.Rect(0, 0, 800, 800))

            self.current_animation = None
            self.process_next_animation(players)
        else:
            print("No current animation to process.")
            self.process_next_animation(players)

    def highlight_possible_move(self, possible_move):
        highlight_color = (0, 255, 255, 128)  # Semi-transparent yellow
        rect = self.board.get_square_rect(possible_move)
        if rect:
            highlight_surface = pygame.Surface((rect.width, rect.height), pygame.SRCALPHA)
            pygame.draw.rect(highlight_surface, highlight_color, highlight_surface.get_rect())
            self.screen.blit(highlight_surface, rect.topleft)

    def update(self, players):
        if self.current_animation:
            self.animate(players)

    def get_current_animated_piece(self):
        if self.current_animation:
            piece_data, path = self.current_animation
                
            if isinstance(piece_data, dict):
                piece = Piece(piece_data.get('color'), piece_data.get('start_position'))
                piece.position = piece_data.get('position')
                piece.is_home = piece_data.get('is_home', False)
                piece.is_finished = piece_data.get('is_finished', False)
                piece.is_selected = piece_data.get('is_selected', False)
                piece.stacked_pieces = piece_data.get('stacked_pieces', 0)
                piece.index = piece_data.get('index', 0)
                piece.player_id = piece_data.get('player_id', 0)
            else:
                piece = piece_data

            return piece, path
        return None, None