import pygame

class Chat:
    def __init__(self, screen, font, send_message_callback):
        self.screen = screen
        self.font = font
        self.send_message_callback = send_message_callback
        self.messages = []
        self.input_text = ""
        self.input_rect = pygame.Rect(810, 760, 380, 30)
        self.chat_surface = pygame.Surface((380, 200))
        self.chat_rect = pygame.Rect(810, 550, 380, 200)
        self.scroll_offset = 0
        self.scroll_bar_rect = pygame.Rect(1190, 550, 5, 200)
        self.scroll_handle_rect = pygame.Rect(1190, 550, 5, 50)
        self.visible_messages = 10
        self.line_height = 20
        self.is_focused = False
        self.cursor_visible = True
        self.cursor_timer = 0
        self.cursor_blink_time = 500  # milliseconds
        self.cursor_pos = 0
        self.max_input_length = 38

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN:
            if self.input_rect.collidepoint(event.pos):
                self.is_focused = True
                if event.button == 1:  # Left click
                    self.set_cursor_position(event.pos[0])
            else:
                self.is_focused = False

        if self.is_focused:
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_RETURN:
                    if self.input_text.strip():
                        self.send_message_callback(self.input_text.strip())
                        self.input_text = ""
                        self.cursor_pos = 0
                        self.scroll_to_bottom()
                elif event.key == pygame.K_BACKSPACE:
                    if self.cursor_pos > 0:
                        self.input_text = self.input_text[:self.cursor_pos - 1] + self.input_text[self.cursor_pos:]
                        self.cursor_pos -= 1
                elif event.key == pygame.K_DELETE:
                    if self.cursor_pos < len(self.input_text):
                        self.input_text = self.input_text[:self.cursor_pos] + self.input_text[self.cursor_pos + 1:]
                        self.cursor_pos = min(self.cursor_pos, len(self.input_text))
                elif event.key == pygame.K_LEFT:
                    if self.cursor_pos > 0:
                        self.cursor_pos -= 1
                elif event.key == pygame.K_RIGHT:
                    if self.cursor_pos < len(self.input_text):
                        self.cursor_pos += 1
                else:
                    if len(self.input_text) < self.max_input_length:
                        self.input_text = self.input_text[:self.cursor_pos] + event.unicode + self.input_text[self.cursor_pos:]
                        self.cursor_pos += 1

        if event.type == pygame.MOUSEBUTTONDOWN:
            if event.button == 4:  # Scroll up
                self.scroll_up()
            elif event.button == 5:  # Scroll down
                self.scroll_down()
            elif event.button == 1:  # Left click
                if self.scroll_bar_rect.collidepoint(event.pos):
                    self.handle_scroll_bar_click(event.pos[1])
        elif event.type == pygame.MOUSEMOTION:
            if event.buttons[0] == 1 and self.scroll_bar_rect.collidepoint(event.pos):
                self.handle_scroll_bar_click(event.pos[1])

    def set_cursor_position(self, mouse_x):
        relative_x = mouse_x - self.input_rect.x - 5
        text_width = 0
        for i, char in enumerate(self.input_text):
            char_width = self.font.size(char)[0]
            if text_width + char_width > relative_x:
                self.cursor_pos = i
                return
            text_width += char_width
        self.cursor_pos = len(self.input_text)

    def scroll_up(self):
        self.scroll_offset = min(len(self.messages) - self.visible_messages, self.scroll_offset + 1)

    def scroll_down(self):
        self.scroll_offset = max(0, self.scroll_offset - 1)

    def scroll_to_bottom(self):
        self.scroll_offset = 0

    def handle_scroll_bar_click(self, y):
        total_messages = len(self.messages)
        if total_messages <= self.visible_messages:
            return
        
        click_position = 1 - (y - self.scroll_bar_rect.top) / self.scroll_bar_rect.height
        self.scroll_offset = int(click_position * (total_messages - self.visible_messages))
        self.scroll_offset = max(0, min(self.scroll_offset, total_messages - self.visible_messages))

    def receive_message(self, message_data):
        sender = message_data.get('sender', 'Unknown')
        message_text = message_data.get('message', '')
        self.messages.append(f"{sender}: {message_text}")
        self.scroll_to_bottom()

    def update(self, dt):
        self.cursor_timer += dt
        if self.cursor_timer >= self.cursor_blink_time:
            self.cursor_visible = not self.cursor_visible
            self.cursor_timer = 0

    def draw(self):
        pygame.draw.rect(self.screen, (200, 200, 200), self.chat_rect)
        
        # Draw chat messages
        self.chat_surface.fill((200, 200, 200))
        y = self.chat_surface.get_height() - self.line_height
        start_index = max(0, len(self.messages) - self.visible_messages - self.scroll_offset)
        end_index = start_index + self.visible_messages
        visible_messages = self.messages[start_index:end_index]
        for message in reversed(visible_messages):
            text_surface = self.font.render(message, True, (0, 0, 0))
            self.chat_surface.blit(text_surface, (5, y))
            y -= self.line_height
        self.screen.blit(self.chat_surface, self.chat_rect)

        # Draw scroll bar
        pygame.draw.rect(self.screen, (150, 150, 150), self.scroll_bar_rect)
        total_messages = len(self.messages)
        if total_messages > self.visible_messages:
            scroll_handle_height = max(20, 200 * (self.visible_messages / total_messages))
            scroll_handle_pos = 550 + (200 - scroll_handle_height) * (1 - self.scroll_offset / (total_messages - self.visible_messages))
            self.scroll_handle_rect = pygame.Rect(1190, scroll_handle_pos, 5, scroll_handle_height)
            pygame.draw.rect(self.screen, (100, 100, 100), self.scroll_handle_rect)

        # Draw input box
        input_color = (240, 240, 255) if self.is_focused else (255, 255, 255)
        pygame.draw.rect(self.screen, input_color, self.input_rect)
        
        # Draw input text
        y = self.input_rect.y + 5
        text_surface = self.font.render(self.input_text, True, (0, 0, 0))
        self.screen.blit(text_surface, (self.input_rect.x + 5, y))
        
        # Draw blinking cursor
        if self.is_focused and self.cursor_visible:
            cursor_x = self.input_rect.x + 5
            text_width = 0
            for i, char in enumerate(self.input_text):
                char_width = self.font.size(char)[0]
                if i == self.cursor_pos:
                    break
                text_width += char_width
            cursor_x += text_width
            pygame.draw.line(self.screen, (0, 0, 0), (cursor_x, self.input_rect.y + 5), (cursor_x, self.input_rect.y + 25), 2)

        # Draw input box outline
        outline_color = (0, 0, 255) if self.is_focused else (0, 0, 0)
        pygame.draw.rect(self.screen, outline_color, self.input_rect, 2)