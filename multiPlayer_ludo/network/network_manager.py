import socketio
import logging
import time
import uuid

class NetworkManager:
    def __init__(self):
        self.sio = socketio.Client()
        self.game_data = {}
        self.user_data = {}
        self.connected = False
        self.game_state_callback = None
        self.skip_turn_callback = None
        self.dice_rolled_callback = None
        self.chat_message_callback = None
        self.game_start_callback = None
        self.game_end_callback = None
        self.app_token_used_callback = None
        self.game_join_callback = None
        self.reconnect_callback = None
        self.current_game_id = None
        self.player = None

    def connect(self, url, max_retries=5, base_delay=1):
        attempt = 0
        while attempt < max_retries:
            try:
                logging.info(f"Attempting to connect to {url} (Attempt {attempt + 1})")
                self.sio.connect(url, transports=['websocket'], wait_timeout=10)
                self.connected = True
                logging.info("Connected to server successfully")
                self.setup_events()
                return  # Exit the method if successful
            except Exception as e:
                logging.error(f"Failed to connect to server: {e}")
                attempt += 1
                delay = base_delay * (2 ** attempt)
                logging.info(f"Retrying in {delay} seconds...")
                time.sleep(delay)
        
        logging.error("Max retries reached. Could not connect to the server.")

    def setup_events(self):
        @self.sio.on('connect')
        def on_connect():
            logging.info("Connected to server")
            self.connected = True

        @self.sio.on('disconnect')
        def on_disconnect():
            logging.info("Disconnected from server")
            self.connected = False

        @self.sio.on('gameStateUpdate')
        def on_game_state_update(data):
            #logging.info(f"Received game state update: {data}")
            self.game_data = data
            if self.game_state_callback:
                self.game_state_callback(data)

        @self.sio.on('currentPlayerChanged')
        def on_current_player_changed(data):
            if self.game_data['gameId'] == data['gameId']:
                self.game_data['currentPlayer'] = data['currentPlayer']
            if self.skip_turn_callback:
                self.skip_turn_callback(data)

        @self.sio.on('diceRolled')
        def on_dice_rolled(data):
            logging.info(f"Received diceRolled event: {data}")
            if self.dice_rolled_callback:
                self.dice_rolled_callback(data)
            else:
                logging.warning("Dice rolled callback not set")

        @self.sio.on('chatMessage')
        def on_chat_message(data):
            logging.info(f"Received chat message: {data}")
            if self.chat_message_callback:
                self.chat_message_callback(data)

        @self.sio.on('gameStarted')
        def on_game_started(data):
            logging.info(f"Game started: {data}")
            if self.game_start_callback:
                self.game_start_callback(data)

        @self.sio.on('appTokenUsed')
        def on_app_token_used(data):
            logging.info(f"App token used: {data}")
            self.user_data = data
            if self.app_token_used_callback:
                self.app_token_used_callback(data)

        @self.sio.on('userJoinedGame')
        def on_user_joined_game(data):
            print(data)
            self.game_data = data
            self.current_game_id = data['gameId']
            self.sio.emit('joinRoom', {'room': data['gameId']})
            logging.info(f"Joined game room: {data['gameId']}")
            if self.game_join_callback:
                self.game_join_callback(data)

        @self.sio.on('userLeftGame')
        def on_user_left_game(data):
            logging.info(f"User left game: {data}")
            if self.game_data['gameId'] == data['gameId']:
                self.current_game_id = None
                self.sio.emit('leaveRoom', {'room': data['gameId']})

        @self.sio.on('reconnectSuccess')
        def on_reconnect_success(data):
            self.game_data = data
            self.current_game_id = data['gameId']
            self.sio.emit('joinRoom', {'room': data['gameId']})
            logging.info(f"Joined game room: {data['gameId']}")
            if self.reconnect_callback:
                self.reconnect_callback(data)

        @self.sio.on('gameEnded')
        def on_game_ended(data):
            logging.info(f"Game ended: {data}")
            self.current_game_id = None
            if self.game_end_callback:
                self.game_end_callback(data)

    def generate_app_token(self):
        app_token = str(uuid.uuid4())
        self.sio.emit('waitForAppToken', app_token)
        return app_token

    def request_dice_roll(self, bot=False):
        if not self.connected:
            logging.error("Not connected to server. Cannot request dice roll.")
            return
        
        self.sio.emit('joinRoom', {'room': self.game_data['gameId']})

        if bot:
            userId = "bot"
        else:
            userId = self.user_data['playerId']

        try:
            data = {
                'gameId': self.game_data['gameId'],
                'userId': userId
            }
            logging.info(f"Requesting dice roll with data: {data}")
            self.sio.emit('rollDice', data)
        except Exception as e:
            logging.error(f"Error requesting dice roll: {e}")

    def send_move(self, game_state):
        if not self.connected:
            logging.error("Not connected to server. Cannot send move.")
            return

        self.sio.emit('updateGameState', {
            'gameId': game_state['gameId'],
            'gameState': game_state,
        })

    def skip_turn(self):
        if not self.connected:
            logging.error("Not connected to server. Cannot skip turn.")
            return

        self.sio.emit('skipTurn', {
            'gameId': self.game_data['gameId'],
            'userId': self.game_data['currentPlayer']
        })

    def send_chat_message(self, message):
        if not self.connected:
            logging.error("Not connected to server. Cannot send chat message.")
            return

        self.sio.emit('chatMessage', {
            'gameId': self.game_data['gameId'],
            'userId': self.user_data['playerId'],
            'message': message
        })

    def reconnect_to_game(self, game_id, user_id):
        if not self.connected:
            logging.error("Not connected to server. Cannot reconnect to game.")
            return

        self.sio.emit('reconnectToGame', {'gameId': game_id, 'userId': user_id})

    def set_game_state_callback(self, callback):
        self.game_state_callback = callback

    def set_skip_turn_callback(self, callback):
        self.skip_turn_callback = callback

    def set_dice_rolled_callback(self, callback):
        self.dice_rolled_callback = callback

    def set_chat_message_callback(self, callback):
        self.chat_message_callback = callback

    def set_game_start_callback(self, callback):
        self.game_start_callback = callback

    def set_app_token_used_callback(self, callback):
        self.app_token_used_callback = callback

    def set_game_join_callback(self, callback):
        self.game_join_callback = callback

    def set_reconnect_callback(self, callback):
        self.reconnect_callback = callback

    def set_game_end_callback(self, callback):
        self.game_end_callback = callback

    def set_player(self, player):
        self.player = player

    def get_player(self):
        return self.player

    def disconnect(self):
        if self.connected:
            self.sio.disconnect()
            self.connected = False
            logging.info("Disconnected from server")