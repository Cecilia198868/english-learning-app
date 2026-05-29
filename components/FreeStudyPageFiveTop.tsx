"use client";

type FreeStudyPageFiveTopProps = {
   userEnglishText: string;
  onAiGuidedPractice: () => void;
  onRetryEnglish: () => void;
  onMenuClick: () => void;
  onAccountClick: () => void;
};

export default function FreeStudyPageFiveTop({
    userEnglishText,
  onAiGuidedPractice,
  onRetryEnglish,
  onMenuClick,
  onAccountClick,
}: FreeStudyPageFiveTopProps) {
  const displayText = userEnglishText.trim() || " ";

  return (
    <div className="sf-free-study-page-five-top">
      <div className="sf-free-study-page-five-top-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/freestudy%205%20A.jpg"
          alt=""
          aria-hidden="true"
          className="sf-free-study-page-five-top-image"
          draggable={false}
        />
        <button
  type="button"
  aria-label="打开菜单"
  onClick={onMenuClick}
  className="sf-free-study-page-five-top-menu"
/>

<button
  type="button"
  aria-label="打开账户"
  onClick={onAccountClick}
  className="sf-free-study-page-five-top-account"
/>

        <button
          type="button"
          aria-label="Open AI guided expression practice"
          onClick={onAiGuidedPractice}
          className="sf-free-study-page-five-top-hit sf-free-study-page-five-top-ai"
        />
       <div className="sf-free-study-page-five-top-expression">
  <p
    lang="en"
    className="sf-free-study-page-five-top-expression-text"
  >
    {displayText}
  </p>

  <button
    type="button"
    aria-label="Record English again"
    onClick={onRetryEnglish}
    className="sf-free-study-page-five-top-hit sf-free-study-page-five-top-retry"
  />
</div><div className="sf-free-study-page-five-top-expression">
  <p
    lang="en"
    className="sf-free-study-page-five-top-expression-text"
  >
    {displayText}
  </p>

  <button
    type="button"
    aria-label="Record English again"
    onClick={onRetryEnglish}
    className="sf-free-study-page-five-top-hit sf-free-study-page-five-top-retry"
  />
</div>
       
      </div>
    </div>
  );
}
