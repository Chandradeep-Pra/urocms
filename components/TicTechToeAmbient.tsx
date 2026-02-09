"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type Cell = "X" | "O" | null;

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export default function TicTechToeAI() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [winner, setWinner] = useState<Cell | "DRAW" | null>(null);

  function checkWinner(b: Cell[]) {
    for (const [a, b1, c] of WIN_LINES) {
      if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
    }
    return b.every(Boolean) ? "DRAW" : null;
  }

  function humanMove(index: number) {
    if (board[index] || winner) return;

    const next = [...board];
    next[index] = "X";
    setBoard(next);
  }

  function aiMove(b: Cell[]) {
    // 1. Win if possible
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        const copy = [...b];
        copy[i] = "O";
        if (checkWinner(copy) === "O") return i;
      }
    }

    // 2. Block human
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        const copy = [...b];
        copy[i] = "X";
        if (checkWinner(copy) === "X") return i;
      }
    }

    // 3. Take center
    if (!b[4]) return 4;

    // 4. Take corners
    const corners = [0, 2, 6, 8].filter((i) => !b[i]);
    if (corners.length) return corners[0];

    // 5. Any free
    return b.findIndex((c) => !c);
  }

  useEffect(() => {
    const result = checkWinner(board);
    if (result) {
      setWinner(result);
      return;
    }

    // AI turn
    if (board.filter(Boolean).length % 2 === 1) {
      const move = aiMove(board);
      if (move !== -1) {
        setTimeout(() => {
          const next = [...board];
          next[move] = "O";
          setBoard(next);
        }, 500);
      }
    }
  }, [board]);

  function reset() {
    setBoard(Array(9).fill(null));
    setWinner(null);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid grid-cols-3 gap-3">
        {board.map((cell, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.95 }}
            onClick={() => humanMove(i)}
            className="h-16 w-16 rounded-lg
                       border border-cyan-400/30
                       bg-black/40
                       flex items-center justify-center
                       shadow-[0_0_25px_rgba(56,189,248,0.15)]"
          >
            {cell && (
              <span
                className={`text-2xl font-semibold ${
                  cell === "X"
                    ? "text-cyan-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.9)]"
                    : "text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.9)]"
                }`}
              >
                {cell}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      <p className="text-xs text-zinc-400">
        {winner
          ? winner === "DRAW"
            ? "Draw"
            : `${winner === "X" ? "Human" : "System"} wins`
          : "Human vs System"}
      </p>

      {winner && (
        <button
          onClick={reset}
          className="text-xs text-cyan-400 hover:underline"
        >
          Reset
        </button>
      )}
    </div>
  );
}
