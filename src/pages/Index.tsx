import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';

interface Piece {
  type: PieceType;
  color: PieceColor;
}

type Board = (Piece | null)[][];

type GameScreen = 'menu' | 'game' | 'stats';

interface GameStats {
  wins: number;
  losses: number;
  draws: number;
}

const PIECE_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
};

const initialBoard = (): Board => [
  [
    { type: 'rook', color: 'black' }, { type: 'knight', color: 'black' }, { type: 'bishop', color: 'black' }, { type: 'queen', color: 'black' },
    { type: 'king', color: 'black' }, { type: 'bishop', color: 'black' }, { type: 'knight', color: 'black' }, { type: 'rook', color: 'black' }
  ],
  Array(8).fill(null).map(() => ({ type: 'pawn', color: 'black' })),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null).map(() => ({ type: 'pawn', color: 'white' })),
  [
    { type: 'rook', color: 'white' }, { type: 'knight', color: 'white' }, { type: 'bishop', color: 'white' }, { type: 'queen', color: 'white' },
    { type: 'king', color: 'white' }, { type: 'bishop', color: 'white' }, { type: 'knight', color: 'white' }, { type: 'rook', color: 'white' }
  ]
];

const Index = () => {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [board, setBoard] = useState<Board>(initialBoard());
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<PieceColor>('white');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [stats, setStats] = useState<GameStats>(() => {
    const saved = localStorage.getItem('chessStats');
    return saved ? JSON.parse(saved) : { wins: 0, losses: 0, draws: 0 };
  });
  const [moveCount, setMoveCount] = useState(0);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    localStorage.setItem('chessStats', JSON.stringify(stats));
  }, [stats]);

  const isValidMove = (fromRow: number, fromCol: number, toRow: number, toCol: number): boolean => {
    const piece = board[fromRow][fromCol];
    if (!piece) return false;

    const targetPiece = board[toRow][toCol];
    if (targetPiece && targetPiece.color === piece.color) return false;

    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    switch (piece.type) {
      case 'pawn':
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;
        if (toCol === fromCol && !targetPiece) {
          if (toRow === fromRow + direction) return true;
          if (fromRow === startRow && toRow === fromRow + 2 * direction && !board[fromRow + direction][fromCol]) return true;
        }
        if (colDiff === 1 && toRow === fromRow + direction && targetPiece) return true;
        return false;

      case 'rook':
        if (fromRow === toRow || fromCol === toCol) {
          const [startR, endR] = fromRow < toRow ? [fromRow, toRow] : [toRow, fromRow];
          const [startC, endC] = fromCol < toCol ? [fromCol, toCol] : [toCol, fromCol];
          if (fromRow === toRow) {
            for (let c = startC + 1; c < endC; c++) {
              if (board[fromRow][c]) return false;
            }
          } else {
            for (let r = startR + 1; r < endR; r++) {
              if (board[r][fromCol]) return false;
            }
          }
          return true;
        }
        return false;

      case 'knight':
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

      case 'bishop':
        if (rowDiff === colDiff) {
          const rowDir = toRow > fromRow ? 1 : -1;
          const colDir = toCol > fromCol ? 1 : -1;
          let r = fromRow + rowDir, c = fromCol + colDir;
          while (r !== toRow && c !== toCol) {
            if (board[r][c]) return false;
            r += rowDir;
            c += colDir;
          }
          return true;
        }
        return false;

      case 'queen':
        if (fromRow === toRow || fromCol === toCol || rowDiff === colDiff) {
          if (fromRow === toRow || fromCol === toCol) {
            const [startR, endR] = fromRow < toRow ? [fromRow, toRow] : [toRow, fromRow];
            const [startC, endC] = fromCol < toCol ? [fromCol, toCol] : [toCol, fromCol];
            if (fromRow === toRow) {
              for (let c = startC + 1; c < endC; c++) {
                if (board[fromRow][c]) return false;
              }
            } else {
              for (let r = startR + 1; r < endR; r++) {
                if (board[r][fromCol]) return false;
              }
            }
          } else {
            const rowDir = toRow > fromRow ? 1 : -1;
            const colDir = toCol > fromCol ? 1 : -1;
            let r = fromRow + rowDir, c = fromCol + colDir;
            while (r !== toRow && c !== toCol) {
              if (board[r][c]) return false;
              r += rowDir;
              c += colDir;
            }
          }
          return true;
        }
        return false;

      case 'king':
        return rowDiff <= 1 && colDiff <= 1;

      default:
        return false;
    }
  };

  const makeAIMove = () => {
    setThinking(true);
    setTimeout(() => {
      const aiMoves: Array<[number, number, number, number]> = [];
      
      for (let fromRow = 0; fromRow < 8; fromRow++) {
        for (let fromCol = 0; fromCol < 8; fromCol++) {
          const piece = board[fromRow][fromCol];
          if (piece && piece.color === 'black') {
            for (let toRow = 0; toRow < 8; toRow++) {
              for (let toCol = 0; toCol < 8; toCol++) {
                if (isValidMove(fromRow, fromCol, toRow, toCol)) {
                  aiMoves.push([fromRow, fromCol, toRow, toCol]);
                }
              }
            }
          }
        }
      }

      if (aiMoves.length > 0) {
        const randomMove = aiMoves[Math.floor(Math.random() * aiMoves.length)];
        const [fromRow, fromCol, toRow, toCol] = randomMove;
        
        const newBoard = board.map(row => [...row]);
        newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
        newBoard[fromRow][fromCol] = null;
        
        setBoard(newBoard);
        setMoveCount(prev => prev + 1);
        setCurrentPlayer('white');
      }
      
      setThinking(false);
    }, 500);
  };

  const handleSquareClick = (row: number, col: number) => {
    if (currentPlayer !== 'white' || thinking) return;

    if (selectedSquare) {
      const [selectedRow, selectedCol] = selectedSquare;
      
      if (isValidMove(selectedRow, selectedCol, row, col)) {
        const newBoard = board.map(row => [...row]);
        const capturedPiece = newBoard[row][col];
        newBoard[row][col] = newBoard[selectedRow][selectedCol];
        newBoard[selectedRow][selectedCol] = null;
        
        setBoard(newBoard);
        setSelectedSquare(null);
        setMoveCount(prev => prev + 1);
        setCurrentPlayer('black');
        
        if (capturedPiece && capturedPiece.type === 'king') {
          setTimeout(() => {
            setStats(prev => ({ ...prev, wins: prev.wins + 1 }));
            setScreen('stats');
          }, 500);
        } else {
          setTimeout(makeAIMove, 300);
        }
      } else {
        const clickedPiece = board[row][col];
        if (clickedPiece && clickedPiece.color === currentPlayer) {
          setSelectedSquare([row, col]);
        } else {
          setSelectedSquare(null);
        }
      }
    } else {
      const clickedPiece = board[row][col];
      if (clickedPiece && clickedPiece.color === currentPlayer) {
        setSelectedSquare([row, col]);
      }
    }
  };

  const startNewGame = (newDifficulty: 'easy' | 'medium' | 'hard') => {
    setDifficulty(newDifficulty);
    setBoard(initialBoard());
    setSelectedSquare(null);
    setCurrentPlayer('white');
    setMoveCount(0);
    setScreen('game');
  };

  const renderMenuScreen = () => (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 md:p-12 bg-card/50 backdrop-blur">
        <div className="text-center space-y-8">
          <div>
            <h1 className="text-5xl md:text-7xl font-bold mb-4 text-primary">Шахматы</h1>
            <p className="text-lg text-muted-foreground">Сразись с искусственным интеллектом</p>
          </div>
          
          <div className="flex justify-center gap-4 text-6xl">
            <span>♔</span>
            <span>♕</span>
            <span>♖</span>
          </div>

          <div className="space-y-3 max-w-md mx-auto">
            <Button 
              size="lg" 
              className="w-full text-lg h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              onClick={() => startNewGame('easy')}
            >
              <Icon name="Zap" className="mr-2" />
              Легкий уровень
            </Button>
            
            <Button 
              size="lg" 
              className="w-full text-lg h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              onClick={() => startNewGame('medium')}
            >
              <Icon name="Target" className="mr-2" />
              Средний уровень
            </Button>
            
            <Button 
              size="lg" 
              className="w-full text-lg h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              onClick={() => startNewGame('hard')}
            >
              <Icon name="Flame" className="mr-2" />
              Сложный уровень
            </Button>

            <Button 
              size="lg" 
              variant="outline" 
              className="w-full text-lg h-14 mt-6 border-2"
              onClick={() => setScreen('stats')}
            >
              <Icon name="BarChart3" className="mr-2" />
              Статистика
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderGameScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <Button variant="outline" onClick={() => setScreen('menu')}>
            <Icon name="ArrowLeft" className="mr-2" />
            Меню
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Ход {moveCount + 1}</p>
            <p className="text-lg font-semibold">
              {thinking ? 'Думаю...' : currentPlayer === 'white' ? 'Ваш ход' : 'Ход ИИ'}
            </p>
          </div>

          <Button variant="outline" onClick={() => setScreen('stats')}>
            <Icon name="BarChart3" className="mr-2" />
            Статистика
          </Button>
        </div>

        {thinking && (
          <div className="mb-4">
            <Progress value={66} className="h-2" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-8 gap-0 border-4 border-primary shadow-2xl" style={{ width: 'min(90vw, 600px)', height: 'min(90vw, 600px)' }}>
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const isLight = (rowIndex + colIndex) % 2 === 0;
            const isSelected = selectedSquare && selectedSquare[0] === rowIndex && selectedSquare[1] === colIndex;
            
            return (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleSquareClick(rowIndex, colIndex)}
                disabled={thinking}
                className={`
                  aspect-square flex items-center justify-center text-4xl sm:text-5xl md:text-6xl
                  transition-all duration-200 hover:brightness-110 active:scale-95
                  ${isLight ? 'bg-[hsl(var(--light-square))]' : 'bg-[hsl(var(--dark-square))]'}
                  ${isSelected ? 'ring-4 ring-yellow-400 ring-inset brightness-125' : ''}
                  ${thinking ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {piece && (
                  <span className={piece.color === 'white' ? 'text-white drop-shadow-lg' : 'text-gray-900 drop-shadow-lg'}>
                    {PIECE_SYMBOLS[piece.color][piece.type]}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      <Button 
        size="lg" 
        variant="destructive"
        onClick={() => {
          setStats(prev => ({ ...prev, losses: prev.losses + 1 }));
          setScreen('menu');
        }}
      >
        Сдаться
      </Button>
    </div>
  );

  const renderStatsScreen = () => {
    const total = stats.wins + stats.losses + stats.draws;
    const winRate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-8 md:p-12 bg-card/50 backdrop-blur">
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-2">Статистика</h2>
              <p className="text-muted-foreground">Ваши результаты</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card className="p-6 text-center bg-green-500/10 border-green-500/30">
                <Icon name="Trophy" className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-3xl font-bold">{stats.wins}</p>
                <p className="text-sm text-muted-foreground">Побед</p>
              </Card>

              <Card className="p-6 text-center bg-red-500/10 border-red-500/30">
                <Icon name="X" className="w-8 h-8 mx-auto mb-2 text-red-500" />
                <p className="text-3xl font-bold">{stats.losses}</p>
                <p className="text-sm text-muted-foreground">Поражений</p>
              </Card>

              <Card className="p-6 text-center bg-blue-500/10 border-blue-500/30">
                <Icon name="Minus" className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <p className="text-3xl font-bold">{stats.draws}</p>
                <p className="text-sm text-muted-foreground">Ничьих</p>
              </Card>
            </div>

            <Card className="p-6 bg-primary/10 border-primary/30">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Процент побед</span>
                <span className="text-2xl font-bold text-primary">{winRate}%</span>
              </div>
              <Progress value={winRate} className="h-3" />
            </Card>

            <div className="space-y-3">
              <Button 
                size="lg" 
                className="w-full text-lg h-14 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => setScreen('menu')}
              >
                <Icon name="Home" className="mr-2" />
                Главное меню
              </Button>

              <Button 
                size="lg" 
                variant="outline"
                className="w-full text-lg h-14 border-2"
                onClick={() => startNewGame('medium')}
              >
                <Icon name="Play" className="mr-2" />
                Новая игра
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {screen === 'menu' && renderMenuScreen()}
      {screen === 'game' && renderGameScreen()}
      {screen === 'stats' && renderStatsScreen()}
    </div>
  );
};

export default Index;
