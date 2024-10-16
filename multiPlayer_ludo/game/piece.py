class Piece:
    def __init__(self, color, start_position):
        self.color = color
        self.position = None
        self.is_home = True
        self.is_finished = False
        self.is_selected = False
        self.start_position = start_position
        self.stacked_pieces = 0

    def move(self, new_position):
        self.position = new_position
        self.is_home = False

    def move_out_of_home(self):
        self.position = self.start_position
        self.is_home = False

    def finish(self):
        self.position = None
        self.is_finished = True
        self.stacked_pieces = 0

    def send_home(self):
        self.position = None
        self.is_home = True
        self.is_finished = False
        self.stacked_pieces = 0

    def __str__(self):
        status = "Home" if self.is_home else "Finished" if self.is_finished else f"At {self.position}"
        stack_info = f", Stacked: {self.stacked_pieces}" if self.stacked_pieces > 0 else ""
        return f"Piece(color={self.color}, {status}, selected={self.is_selected}{stack_info})"