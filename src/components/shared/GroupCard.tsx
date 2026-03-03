import { ChevronDown, ChevronUp } from "lucide-react";
import { Icons } from "../icons";
import { Collapsible, CollapsibleContent } from "../ui/collapsible";
import CreditCardCard from "./CreditCardCard";

type Card = {
  id: string;
  name: string;
  currentBalance: string;
  statementDate?: number;
  dueDate?: number;
};

interface GroupCardProps {
  groupName: string;
  totalBalance: number;
  cardCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onGroupClick: () => void;
  cards: Card[];
  onCardClick: (cardId: string) => void;
  onCardEdit: (cardId: string) => void;
  onCardDelete: (cardId: string, cardName: string) => void;
}

const GroupCard = ({
  groupName,
  totalBalance,
  cardCount,
  isExpanded,
  onToggleExpand,
  onGroupClick,
  cards,
  onCardClick,
  onCardEdit,
  onCardDelete,
}: GroupCardProps) => {
  const formattedBalance = Math.abs(totalBalance).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex flex-col bg-card border border-border rounded-md shadow-md overflow-hidden">
      {/* Group Card Header */}
      <div className="flex flex-col gap-3 p-4 hover:bg-card/70 transition-all duration-200">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - clickable to navigate */}
          <div
            className="flex flex-col gap-1 flex-1 cursor-pointer"
            onClick={onGroupClick}
          >
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icons.creditCardIcon size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-foreground font-bold md:text-lg lg:text-xl">
                  {groupName}
                </p>
                <p className="text-muted-foreground text-xs">
                  {cardCount} {cardCount === 1 ? "card" : "cards"}
                </p>
              </div>
            </div>
          </div>

          {/* Right side - expand/collapse icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-2 hover:bg-secondary/10 rounded-lg transition-colors"
            aria-label={isExpanded ? "Collapse group" : "Expand group"}
          >
            {isExpanded ? (
              <ChevronUp size={20} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={20} className="text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Balance */}
        <div
          className="flex flex-col items-end cursor-pointer"
          onClick={onGroupClick}
        >
          <div className="flex items-end justify-center gap-2">
            <span className="text-muted-foreground font-light text-xs md:text-md">
              PHP
            </span>
            <p className="text-foreground md:text-md lg:text-lg">
              {formattedBalance}
            </p>
          </div>
          <p className="text-muted-foreground text-xs">Total outstanding balance</p>
        </div>
      </div>

      {/* Collapsible Child Cards */}
      <Collapsible open={isExpanded}>
        <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="border-t border-border/50 bg-muted/20 flex flex-col gap-2 p-3 pl-6">
            {cards.map((card) => (
              <CreditCardCard
                key={card.id}
                id={card.id}
                name={card.name}
                statementDate={card.statementDate}
                dueDate={card.dueDate}
                currentBalance={card.currentBalance}
                onClick={() => onCardClick(card.id)}
                onEdit={() => onCardEdit(card.id)}
                onDelete={() => onCardDelete(card.id, card.name)}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default GroupCard;